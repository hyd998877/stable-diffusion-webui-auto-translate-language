
import gradio as gr
from pathlib import Path
from modules import script_callbacks, shared
import json
import os
from typing import List
from lru import LRU

from typing import Optional
# import asyncio
import concurrent.futures
from fastapi import FastAPI, Response, Body

from scripts.lan import lans

# from scripts.trans_google import GoogleTranslate
from scripts.trans_youdao import YoudaoTranslate
from scripts.trans_tp import TpTranslate,init_transers

transers = ['free_youdao_zh']
init_transers(transers)
transer = None
# Webui root path
ROOT_DIR = Path().absolute()
trans_file = os.path.join(ROOT_DIR, "localizations/my.json")

current_path = os.path.dirname(os.path.abspath(__file__))
config_file = os.path.join(current_path, "config.json")

trans_succ = 0
trans_config = None
textbox_info = None
end_trans_btn = None
m_temp_trans_list = None
m_temp_transed_num = 0
trans_data = None

m_trans_dict = LRU(1000)

def read_or_create_json_file(filename):
    if not os.path.exists(filename):
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({}, f)
    
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return data

def update_json_key(filename, data, key, value):
    data[key] = value
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
        
    # print(f'{filename} update: {key}={value}')

def update_json_file(filename,data):
    # if not data:
    #     print('data is None')
    #     return
    # 保存 JSON 文件
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
        
    # print(f'{filename} update all')

def check_transer():
    global transer
    cur_transer = trans_config['transer']
    # if cur_transer == 'free_google':
    #     transer = GoogleTranslate()
    if cur_transer == 'free_youdao_zh':
        transer = YoudaoTranslate()
    else:
        if cur_transer.startswith("tp_"):
            tp_transer = cur_transer[3:]
            transer = TpTranslate(tp_transer)

def init():
    global trans_config
    global trans_data
    global trans_succ
    trans_data = read_or_create_json_file(trans_file)
    trans_succ = len(list(trans_data))
    trans_config = read_or_create_json_file(config_file)
    if 'show_en_enabled' not in trans_config:
        # trans_config['auto_language_enabled'] = False
        trans_config['show_en_enabled'] = True
        trans_config['to_lan'] = 'zh-CN'
        trans_config['transer'] = 'tp_bing'
    trans_config['trans_succ'] = trans_succ
    check_transer()


init()
#--------------------------------ui---------------------------------------

def update_info():
    textbox_info.update(f'Auto Translate Num:{trans_succ}')

def auto_remove_trans():
    global trans_data
    global trans_succ
    print('auto_remove_trans', trans_succ)
    if trans_succ==0:
        return
    trans_succ = 0
    trans_data = {}
    update_json_file(trans_file,trans_data)

    textbox_info.update(f'Auto Translate Num:{trans_succ}')

def on_ui_tabs():
    global textbox_info
    global end_trans_btn
    with gr.Blocks(analytics_enabled=False) as translate_interface:
        gr.HTML("<p style=\"margin-bottom:0.75em\">The untranslated characters will be translated automatically and will not affect the old translations. Use the function in the lower right corner to easily check and quickly modify the current translation.1,Save the setting;2,Click start button;3,Reload your browser.</p>")
        with gr.Row():
            with gr.Column(scale=80):
                textbox_info = gr.Textbox(label='Translated Status', value=f'Auto Translate Num:{trans_succ}',readonly=True, elem_id="auto_textbox_info")
            auto_trans_btn = gr.Button(value="Start Auto Translate", variant='primary', elem_id="auto_trans_btn")
        with gr.Row():
            with gr.Column(scale=45):
                text_lan = gr.Textbox(label="Text", lines=3, value="", elem_id="auto_text_lan", placeholder="your select language")
            with gr.Column():
                with gr.Row():
                    auto_trans_to_en = gr.Button(value=f'-->', elem_id="auto_trans_to_en")
                with gr.Row():
                    auto_trans_to_lan = gr.Button(value=f'<--', elem_id="auto_trans_to_lan")
                
            with gr.Column(scale=45):
                text_lan_translated = gr.Textbox(label="Translated Text", lines=3, value="", elem_id="text_lan_translated", placeholder="english")


        gr.HTML("<hr />")
        with gr.Row():
            with gr.Column(scale=5):
                with gr.Row():
                    tar_lang_drop = gr.Dropdown(label="To Language", choices=lans, value=trans_config['to_lan'], elem_id="auto_to_lang")
                    auto_langer_drop = gr.Dropdown(label="Select Translater", choices=transers, value=trans_config['transer'], elem_id="auto_langer_drop")
                with gr.Row():
                    # auto_language_enabled = gr.Checkbox(label='enable auto trans ui language.(Need reload browser)', elem_id='auto_language_enabled', value=trans_config['auto_language_enabled'])
                    show_en_enabled = gr.Checkbox(label='display both english and target language', elem_id='show_en_enabled', value=trans_config['show_en_enabled'])
                with gr.Row():
                    save_trans_setting_btn = gr.Button(value="Save Setting", elem_id='save_trans_setting_btn')
                    remove_trans_btn = gr.Button(value="Remove Auto Trans", elem_id='remove_trans_btn')
            with gr.Column(scale=5, elem_id='auto_language_jsdiv'):
                pass

        end_trans_btn = gr.Button(value="Remove Auto Trans", elem_id='end_trans_btn', visible=False)
        end_trans_btn.click(None,_js="auto_end_auto_trans", show_progress=False, inputs=[],outputs=[])
        remove_trans_btn.click(fn=auto_remove_trans,show_progress=False, inputs=[],outputs=[])
        tar_lang_drop.change(None,_js="auto_change_lan", inputs=[tar_lang_drop])
        auto_langer_drop.change(None,_js="auto_change_transer", inputs=[auto_langer_drop])
        # auto_language_enabled.change(None,_js="auto_change_language_enabled", inputs=[auto_language_enabled])
        show_en_enabled.change(None,_js="auto_change_show_en_enabled", inputs=[show_en_enabled])

    return [(translate_interface, "Auto Translate", "auto_translate")]


script_callbacks.on_ui_tabs(on_ui_tabs)

#--------------------------------api--------------------------------------
def transAPI(demo: gr.Blocks, app: FastAPI):
    @app.get("/trans/config")
    async def config():
        res_data = {"error": 0}
        res_data['config'] = trans_config
        return res_data

    @app.post("/trans/save_config")
    async def auto_save_setting(data: dict = Body(...)):
        res_data = {"error": 0}
        # trans_config['auto_language_enabled'] = data['auto_language_enabled']
        trans_config['show_en_enabled'] = data['show_en_enabled']
        if trans_config['to_lan'] != data['to_lan']:
            auto_remove_trans()
        trans_config['to_lan'] = data['to_lan']
        if trans_config['transer'] != data['transer']:
            trans_config['transer'] = data['transer']
            check_transer()
        
        if 'appid' in data:
            trans_config['appid'] = data['appid']

        update_json_file(config_file, trans_config)

        return res_data

    @app.get("/trans/local_trans")
    async def local_trans(text, save: Optional[bool] = True, en: Optional[bool] = False):
        res_data = {"error": 0}
        res_text = ''
        global trans_succ
        global m_trans_dict
        global trans_data
        if len(text) > 0:
            print('text', text, save, en)
            if text in trans_data:
                res_text = trans_data[text]
            elif text in m_trans_dict:
                res_text = m_trans_dict[text]
            else:
                if en:
                    res_text = transer.translate(text, trans_config['to_lan'], 'en')
                else:
                    res_text = transer.translate(text, 'en', trans_config['to_lan'])
                print('local_trans', text, res_text)
                if res_text != text and len(res_text)>0:
                    trans_succ = trans_succ + 1
                    m_trans_dict[text] = res_text
                    update_info()
                    if save:
                        update_json_key(trans_file, trans_data, text, res_text)
        else:
            res_data['error']=-1
        res_data['txt'] = res_text
        return res_data
    
    def heavy_computation():
        global trans_succ
        global m_trans_dict
        global m_temp_trans_list
        global m_temp_transed_num
        global trans_data
        for text in m_temp_trans_list:
            m_temp_transed_num = m_temp_transed_num + 1
            if text in trans_data or text in m_trans_dict:
                continue
            res_text = transer.translate(text, 'en', trans_config['to_lan'])
            print('local_trans', text, res_text)
            
            if res_text != text and len(res_text)>0:
                trans_succ = trans_succ + 1
                m_trans_dict[text] = res_text
                update_info()
                update_json_key(trans_file, trans_data, text, res_text)

    @app.post("/trans/local_trans_list")
    async def local_trans_list(json_str: str = Body(...)):
        res_data = {"error": 0}
        items=json.loads(json_str)
        global m_temp_trans_list
        m_temp_trans_list = items
        # print('local_trans_list items', items)

        # asyncio.create_task(heavy_computation())
        executor = concurrent.futures.ThreadPoolExecutor()
        future = executor.submit(heavy_computation)

        return res_data

    @app.get("/trans/progress")
    async def progress_get():
        res_data = {"error": 0, "completed": False, "progress":0, "textinfo":"", "active":False, "trans_succ":trans_succ}
        global m_temp_trans_list
        global m_temp_transed_num
        if m_temp_trans_list:
            res_data['active'] = True
            res_data['progress'] = m_temp_transed_num/len(m_temp_trans_list)
            if m_temp_transed_num>0:
                key = m_temp_trans_list[m_temp_transed_num-1]
                if key in m_trans_dict:
                    res_data['textinfo'] = key+'->'+m_trans_dict[key]
            if res_data['progress']==int(1):
                res_data['completed'] = True
                m_temp_trans_list = None
                m_temp_transed_num = 0

        return res_data
    
    @app.post("/trans/progress")
    async def progress():
        return await progress_get()

    @app.get("/trans/local_save_trans")
    async def local_save_trans(text, tran):
        global trans_data
        res_data = {"error": 0}
        if len(text) > 0:
            update_json_key(trans_file,trans_data, text, tran)
        else:
            res_data = {"error": -1}
        return res_data



script_callbacks.on_app_started(transAPI)