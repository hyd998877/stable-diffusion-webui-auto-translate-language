import requests
import json

lan_map = {
    'zh-CN2en':'ZH_CN2EN',
    'zh-CN2ja':'ZH_CN2JA',
    'zh-CN2kr':'ZH_CN2KR',
    'zh-CN2fr':'ZH_CN2FR',
    'zh-CN2ru':'ZH_CN2RU',
    'zh-CN2sp':'ZH_CN2SP',

    'en2zh-CN':'EN2ZH_CN',
    'ja2zh-CN':'JA2ZH_CN',
    'kr2zh-CN':'KR2ZH_CN',
    'fr2zh-CN':'FR2ZH_CN',
    'ru2zh-CN':'RU2ZH_CN',
    'sp2zh-CN':'SP2ZH_CN'
}


class YoudaoTranslate():
    def __init__(self):
        print('init YoudaoTranslate')

    def translate(self, input_string, input_lang='', output_lang='', retry=False):
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36"}
        res_txt = '' 
        key = input_lang+'2'+output_lang
        if key in lan_map:
            ty = lan_map[key]
            print('ty', ty)
            url = f'http://fanyi.youdao.com/translate?&doctype=json&type={ty}&i={input_string}'
        else:
            url = f'http://fanyi.youdao.com/translate?&doctype=json&type=AUTO&i={input_string}'
        if url==None:
            return res_txt
        response = requests.get(url, headers = headers)
        if response.status_code == 200:
            try:
                j_data = json.loads(response.text)
                if j_data['errorCode'] == 0:
                    res_txt = j_data['translateResult'][0][0]['tgt']
                else:
                    print('youdao', response.text)
            except Exception as e:
                print(e)
            finally:
                pass
        else:
            print('youdao status_code', response.status_code)
            
        return res_txt

if __name__ == "__main__":
    tran = YoudaoTranslate()
    print('res', tran.translate("test", output_lang='zh-CN'))