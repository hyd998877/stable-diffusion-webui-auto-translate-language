 
// this list no trans
var pass_keys = {
  "BSRGAN":1,
  "DDIM Eta":1,
  "Trans Js":1,
  "logSNR":1,
  "DDPM":1,
  "UniPCMultistep":1,
  "LMSDiscrete":1,
  "EulerDiscrete":1,
  "Filewords":1,
  "xformers":1,
  "PNDM":1,
  "vae":1,
  "lms":1,
  "pndm":1,
  "ddim":1,
  "dpmsolver":1,
  "SGDNesterov":1,
  "AdamW":1,
  "DAdaptation":1,
  "DPMSolverMultistep":1,
  "DEISMultistep":1,
  "HeunDiscrete":1,
  "devilkkw":1,
  "parrotzone":1,
  "AdaFactor":1,
  "adafactor":1,
  "lowram":1,
  "dpmsingle":1,
  "veryslow":1,
  "Perlin H":1,
  "EulerAncestralDiscrete":1,
  "DPMSolverSinglestep":1,
  "LoRA":1
}

// is en
function containsEnWorld(text) {
  if (text.length<=3)
    return false
  if(pass_keys[text])
    return false
  if (/^[a-zA-Z\s]*[a-zA-Z][.?!]?$/.test(text)) {
    return true;
  }
  return false
}

function get_config(filePath) {
  let request = new XMLHttpRequest();
  request.open("GET", 'trans/config', false);//Async
  request.send(null);
  if (request.responseText.length == 0) return '';

  try{
    var json = JSON.parse(request.responseText)
    return json.config;
  }catch(e){
  }
  return {}
}

function auto_save_setting() {
  var data = {
    // auto_language_enabled:gradioApp().querySelector('#auto_language_enabled input').checked,
    show_en_enabled:gradioApp().querySelector('#show_en_enabled input').checked,
    to_lan:gradioApp().querySelector('#auto_to_lang select').value,
    transer:gradioApp().querySelector('#auto_langer_drop select').value
  }
  

  let request = new XMLHttpRequest();
  request.open("POST", 'trans/save_config', false);//Async
  request.setRequestHeader("Content-Type", "application/json");
  request.send(JSON.stringify(data));
  if (request.responseText.length == 0) return '';

  try{
    var json = JSON.parse(request.responseText)
    if (json.error == 0) {
      showToast('save settings successful')
    }
  }catch(e){
  }
  return
}

function local_trans_list(text_list) {
  const list = Array.from(text_list);
  if (list.length == 0) {
    showToast('trans list is empty')
    return
  }
  let request = new XMLHttpRequest();
  request.open("POST", `trans/local_trans_list`, true);//is Async
  request.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
        auto_end_auto_trans()
    }
  };
  request.send(JSON.stringify(list));
}

function local_trans(text, save=true, is_async=true, en=false) {
  if (text.length == 0) {
    showToast('trans text is empty')
    return
  }
  let request = new XMLHttpRequest();
  is_safe = save?1:0
  request.open("GET", `trans/local_trans?text=${text}&&save=${is_safe}&&en=${en}`, is_async);//is Async
  request.send(null);
  if (request.responseText.length == 0) return '';
  var json = JSON.parse(request.responseText)
  return json.txt;
}

function local_save_trans(text, tran) {
  let request = new XMLHttpRequest();
  request.open("GET", `trans/local_save_trans?text=${text}&&tran=${tran}`, true);//Async
  request.send(null);

}

function read_file(filePath) {
  let request = new XMLHttpRequest();
  request.open("GET", `file=${filePath}`, false);// no async
  request.send(null);
  return request.responseText;
}

function auto_download_localization() {
  try{
    var json = JSON.parse(read_file('localizations/my.json?time='+Date.now()))
    Object.keys(json).forEach(function(key){
        localization[key] = json[key]
    })
  }catch(e){

  }
}


function getTranslation(text){
    if(! text) return undefined

    if(translated_lines[text] === undefined){
        original_lines[text] = 1
    }

    tl = localization[text]
    if(tl !== undefined){
        if (tl==text) return undefined
        translated_lines[tl] = 1

        if(typeof(trans_config)!='undefined' && trans_config.show_en_enabled)
          tl = text+'/'+tl
        // else
        //   tl = text
    }else{
        if (containsEnWorld(text)) {
          // local_trans(text)
          trans_config.trans_list.add(text)
        }
    }

    return tl
}

function auto_change_lan(v){
}

function auto_change_transer(v){
}

function auto_change_language_enabled(v){
}

function auto_change_show_en_enabled(v){
}

function auto_end_auto_trans(){
  gradioApp().getElementById('auto_trans_btn').innerHTML="Start Auto Translate"
  showToast('finish')
}

function getActivePrompt() {
    const currentTab = get_uiCurrentTabContent();
    switch (currentTab.id) {
        case "tab_txt2img":
            return currentTab.querySelector("#txt2img_prompt textarea");
        case "tab_img2img":
            return currentTab.querySelector("#img2img_prompt textarea");
    }
    return null;
}

function getActiveNegativePrompt() {
    const currentTab = get_uiCurrentTabContent();
    switch (currentTab.id) {
        case "tab_txt2img":
            return currentTab.querySelector("#txt2img_neg_prompt textarea");
        case "tab_img2img":
            return currentTab.querySelector("#img2img_neg_prompt textarea");
    }
    return null;
}

function showProgress(progressbarContainer,atEnd,progress_call){
    var dateStart = new Date()
    var wasEverActive = false
    var parentProgressbar = progressbarContainer.parentNode
    
    var divProgress = document.createElement('div')
    divProgress.className='progressDiv'
    divProgress.style.display = ""
    var divInner = document.createElement('div')
    divInner.className='progress'

    divProgress.appendChild(divInner)
    parentProgressbar.insertBefore(divProgress, progressbarContainer)

    var removeProgressBar = function(){
        setTitle("")
        parentProgressbar.removeChild(divProgress)
    
        atEnd && atEnd()
    }

    var fun = function(id_live_preview){
        request("./trans/progress", {}, function(res){
            progress_call && progress_call(res)
            if(res.completed){
                removeProgressBar()
                return
            }

            var rect = progressbarContainer.getBoundingClientRect()

            if(rect.width){
                divProgress.style.width = rect.width + "px";
            }

            progressText = ""

            divInner.style.width = ((res.progress || 0) * 100.0) + '%'
            divInner.style.background = res.progress ? "" : "transparent"

            if(res.progress > 0){
                progressText = ((res.progress || 0) * 100.0).toFixed(0) + '%'
            }

            setTitle(progressText)

            if(res.textinfo && res.textinfo.indexOf("\n") == -1){
                progressText = res.textinfo + " " + progressText
            }

            divInner.textContent = progressText

            var elapsedFromStart = (new Date() - dateStart) / 1000

            if(elapsedFromStart > 5 && !res.active){
                removeProgressBar()
                return
            }

            setTimeout(() => {
                fun(res.id_live_preview);
            }, 500)
        }, function(){
            removeProgressBar()
        })
    }

    fun(0)
}

function showToast(message) {
  var toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = "toast";
    gradioApp().appendChild(toast);
  }

  toast.innerHTML = message;
  toast.style.opacity = 1;
  setTimeout(() => {
    toast.style.opacity = 0;
  }, 2000);
}

function hide_trans_dialg() {
  const dialogs = document.querySelectorAll('[id^="dialog_"]');
  dialogs.forEach(dialog => {
    dialog.remove();
  });
}

function show_trans_dialg(to_lan, top, left, title, getPrompt_fun) {
    if (document.getElementById('dialog_'+title)) {
      return
    }
    // create draggable window
    const windowDiv = document.createElement('div');
    windowDiv.style.position = 'absolute';
    windowDiv.style.top = top+'px';
    windowDiv.style.left = left+'px';
    windowDiv.style.width = '600px';
    windowDiv.style.height = '180px';
    windowDiv.style.border = 'none';
    windowDiv.style.background = '#f5f5f5';
    windowDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
    windowDiv.style.zIndex = '9999';
    windowDiv.id = 'dialog_'+title
    document.body.appendChild(windowDiv);
    
    // create title bar
    const titleBar = document.createElement('div');
    titleBar.style.position = 'absolute';
    titleBar.style.top = '0px';
    titleBar.style.left = '0px';
    titleBar.style.width = '580px';
    titleBar.style.height = '30px';
    titleBar.style.background = '#4CAF50';
    titleBar.style.color = 'white';
    titleBar.style.fontSize = '16px';
    titleBar.style.display = 'flex';
    titleBar.style.alignItems = 'center';
    titleBar.style.justifyContent = 'space-between';
    titleBar.style.padding = '0px 10px';
    titleBar.innerHTML = title;
    titleBar.draggable = true;
    windowDiv.appendChild(titleBar);

    // create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '5px';
    closeButton.addEventListener('click', () => {
      windowDiv.remove();
    });
    titleBar.appendChild(closeButton);
    

    // make title bar draggable
    let shiftX = 0;
    let shiftY = 0;
    let isDragging = false;

    titleBar.addEventListener('mousedown', function(event) {
      if (event.target !== closeButton && event.target !== translateButton && event.target !== backButton && event.target !== inputBox) {
        isDragging = true;
        shiftX = event.clientX - windowDiv.getBoundingClientRect().left;
        shiftY = event.clientY - windowDiv.getBoundingClientRect().top;
      }
    });

    document.addEventListener('mousemove', function(event) {
      if (isDragging) {
        windowDiv.style.left = event.pageX - shiftX + 'px';
        windowDiv.style.top = event.pageY - shiftY + 'px';
      }
    });

    document.addEventListener('mouseup', function(event) {
      isDragging = false;
    });

    
    
    // create input text box
    const inputBox = document.createElement('textarea');
    inputBox.id='auto_input_strans_'+title
    inputBox.style = `
        position: absolute;
        top: 50px;
        left: 10px;
        width: 570px;
        height: 80px;
        border-radius: 5px;
        border: none;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
        font-size: 16px;
        padding-left: 10px;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: pre-wrap;
    `;
    inputBox.placeholder = 'Enter text to translate';
    windowDiv.appendChild(inputBox);

    const charCountLabel = document.createElement('label');
    charCountLabel.style = `
        position: absolute;
        bottom: 27px;
        left: 10px;
        font-size: 16px;
        color: #4CAF50;
    `;
    charCountLabel.innerHTML = '';
    inputBox.addEventListener('input', () => {
        charCountLabel.innerHTML = inputBox.value.length + ' c';
    });
    windowDiv.appendChild(charCountLabel);

    const addButton = document.createElement('button');
    addButton.innerHTML = '+';
    addButton.style.position = 'absolute';
    addButton.style.top = '140px';
    addButton.style.left = '120px';
    addButton.style.width = '80px';
    addButton.style.height = '30px';
    addButton.style.borderRadius = '5px';
    addButton.style.border = 'none';
    addButton.style.background = '#4CAF50';
    addButton.style.color = 'white';
    addButton.style.fontSize = '16px';
    addButton.addEventListener('click', () => {
      const inputText = inputBox.value;
      if (inputText.length==0) {return}
      const translatedText = local_trans(inputText, false, false, true);
      if (translatedText.length==0 || translatedText==inputText) {return}
      const prompt = getPrompt_fun();
      if (prompt.value.length==0)
        prompt.value = translatedText
      else
        prompt.value = prompt.value + ',' + translatedText
      trans_config[title] = null
      trans_config[title+'trans'] = null
    });
    addButton.addEventListener('mousedown', () => {
      addButton.style.background = '#3e8e41';
    });
    addButton.addEventListener('mouseup', () => {
      addButton.style.background = '#4CAF50';
    });
    windowDiv.appendChild(addButton);

    // create translate button
    const translateButton = document.createElement('button');
    translateButton.innerHTML = 'Translate En';
    translateButton.style.position = 'absolute';
    translateButton.style.top = '140px';
    translateButton.style.left = '240px';
    translateButton.style.width = '140px';
    translateButton.style.height = '30px';
    translateButton.style.borderRadius = '5px';
    translateButton.style.border = 'none';
    translateButton.style.background = '#4CAF50';
    translateButton.style.color = 'white';
    translateButton.style.fontSize = '16px';
    translateButton.addEventListener('click', () => {
      const inputText = inputBox.value;
      if (inputText.length==0) {return}
      if (inputText == trans_config[title]) {
        prompt.value = trans_config[title+'trans']
      }else{
        const translatedText = local_trans(inputText, false, false, true);
        if (translatedText.length==0 || translatedText==inputText) {return}
        const prompt = getPrompt_fun();
        prompt.value = translatedText
        trans_config[title] = inputText
        trans_config[title+'trans'] = translatedText
      }
    });
    translateButton.addEventListener('mousedown', () => {
      translateButton.style.background = '#3e8e41';
    });
    translateButton.addEventListener('mouseup', () => {
      translateButton.style.background = '#4CAF50';
    });
    windowDiv.appendChild(translateButton);
    
    // create back button
    const backButton = document.createElement('button');
    backButton.innerHTML = 'Translate '+to_lan;
    backButton.style.position = 'absolute';
    backButton.style.top = '140px';
    backButton.style.left = '420px';
    backButton.style.width = '140px';
    backButton.style.height = '30px';
    backButton.style.borderRadius = '5px';
    backButton.style.border = 'none';
    backButton.style.background = '#4CAF50';
    backButton.style.color = 'white';
    backButton.style.fontSize = '16px';
    backButton.addEventListener('click', () => {
      const prompt = getPrompt_fun();
      const inputText = prompt.value;
      if (inputText.length==0) {return}
      if (inputText == trans_config[title+'trans']) {
        inputBox.value = trans_config[title]
      }else{
        const translatedText = local_trans(inputText, false, false);
        if (translatedText.length==0 || translatedText==inputText) {return}
        inputBox.value = translatedText
        trans_config[title] = translatedText
        trans_config[title+'trans'] = inputText
      }
    });
    backButton.addEventListener('mousedown', () => {
      backButton.style.background = '#3e8e41';
    });
    backButton.addEventListener('mouseup', () => {
      backButton.style.background = '#4CAF50';
    });
    windowDiv.appendChild(backButton);
}

(function () {
  const customCSS = `
    #toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      background-color: rgba(0, 0, 0, 0.7);
      color: #fff;
      border-radius: 5px;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    `

  function add_tool_btn(parent, html, id, title, cb){
      const btn = document.createElement('button');
      btn.innerHTML=html
      btn.classList.add('gr-button')
      btn.classList.add('gr-button-lg')
      btn.classList.add('gr-button-tool')
      btn.id=id
      btn.title = title
      parent.appendChild(btn)
      btn.addEventListener('click', cb)
  }

  function add_div(){
    // add btn
    var txt_parent = gradioApp().getElementById('txt2img_tools')
    var img_parent = gradioApp().getElementById('img2img_tools')
    if(!txt_parent || !img_parent) return false;
    if(!gradioApp().getElementById('txt_trans_prompt')){
      add_tool_btn(txt_parent, 'en2', 'txt_en2','translate prompt.', ()=>{
        trans_config.cur_tab_index = get_tab_index('tabs')
        show_trans_dialg(trans_config.to_lan, 21, 57, "txt2img Prompt", getActivePrompt)
      })

      add_tool_btn(txt_parent, 'N2', 'txt_N2','translate negative prompt.', ()=>{
        trans_config.cur_tab_index = get_tab_index('tabs')
        show_trans_dialg(trans_config.to_lan, 340, 57, "txt2img Negative Prompt", getActiveNegativePrompt)
      })

      add_tool_btn(img_parent, 'en2', 'img_en2','translate prompt.', ()=>{
        trans_config.cur_tab_index = get_tab_index('tabs')
        show_trans_dialg(trans_config.to_lan, 21, 57, "img2img Prompt",getActivePrompt)
      })

      add_tool_btn(img_parent, 'N2', 'img_N2','translate negative prompt.', ()=>{
        trans_config.cur_tab_index = get_tab_index('tabs')
        show_trans_dialg(trans_config.to_lan, 340, 57, "img2img Negative Prompt", getActiveNegativePrompt)
      })
    }
    
    var node = gradioApp().getElementById('auto_language_jsdiv')
    if(!node) return false;
    var session = node
    const modal = document.createElement('div')
    modal.innerHTML = `
    <div class="flex row w-full flex-wrap gap-4">
      <div class="gr-form flex border-solid border bg-gray-200 dark:bg-gray-700 gap-px rounded-lg flex-wrap" style="flex-direction: inherit;">
        <div class="gr-block gr-box relative w-full border-solid border border-gray-200 gr-padded"> 
          <label class="block w-full"><span class="text-gray-500 text-[0.855rem] mb-2 block dark:text-gray-200 relative z-40">ui text</span> 
          <textarea id="text_local_item" data-testid="textbox" class="scroll-hide block gr-box gr-input w-full gr-text-input" placeholder="need input your want to translate" rows="3" style="overflow-y: scroll; height: 84px;"></textarea>
          </label>
        </div>
        <div class="gr-block gr-box relative w-full border-solid border border-gray-200 gr-padded"> 
          <label class="block w-full"><span class="text-gray-500 text-[0.855rem] mb-2 block dark:text-gray-200 relative z-40">translated text</span> 
          <textarea  id="text_local_tran"  class="scroll-hide block gr-box gr-input w-full gr-text-input" placeholder="Can be empty, indicating no translation" rows="3" style="overflow-y: scroll; height: 84px;"></textarea></label>
        </div>
      </div>
    </div>
    <div class="flex row w-full flex-wrap gap-4">
      <button class="gr-button gr-button-lg gr-button-secondary" id="local_load_btn">load</button>
      <button class="gr-button gr-button-lg gr-button-secondary" id="local_load_tran">translate</button>
      <button class="gr-button gr-button-lg gr-button-secondary" id="local_load_save">save</button>
    </div>
    `
    session.appendChild(modal);

    gradioApp().getElementById('local_load_btn').addEventListener('click', () => {
      var text_local_item = gradioApp().querySelector('#text_local_item')
      var text_local_tran = gradioApp().querySelector('#text_local_tran')
      if (text_local_item.value.length==0) {
        return
      }
      var out_txt = localization[text_local_item.value]
      if (out_txt) {
        text_local_tran.value = out_txt
        text_local_tran.placeholder = 'find but no translated:'+text_local_item.value
      }else{
        text_local_tran.value = ''
        text_local_tran.placeholder = 'no find:'+text_local_item.value
      }
      
    }
    );
    gradioApp().getElementById('local_load_tran').addEventListener('click', () => 
      {
        var text_local_item = gradioApp().querySelector('#text_local_item')
        var text_local_tran = gradioApp().querySelector('#text_local_tran')
        if (text_local_item.value.length==0) {
          text_local_item.placeholder = 'empty strings cannot be translated'
          return
        }
        var out_txt = local_trans(text_local_item.value, false)// no save
        if (out_txt && out_txt.length>0 && out_txt!=text_local_item.value) {
          text_local_tran.value = out_txt
        }else{
          text_local_tran.value = ''
          text_local_tran.placeholder = 'translated fail:'+text_local_item.value
        }
      }
    );
    gradioApp().getElementById('local_load_save').addEventListener('click', () => 
      {
        var text_local_item = gradioApp().querySelector('#text_local_item')
        var text_local_tran = gradioApp().querySelector('#text_local_tran')
        if (text_local_item.value.length==0) {
          text_local_item.placeholder = 'empty cannot be saved'
          return
        }
        local_save_trans(text_local_item.value, text_local_tran.value)
        localization[text_local_item.value] = text_local_tran.value
        showToast('save successful')
      }
    );
    gradioApp().getElementById('save_trans_setting_btn').addEventListener('click', () => 
      {
        auto_save_setting()
      }
    );

    gradioApp().getElementById('auto_trans_to_en').addEventListener('click', () => 
      {
        var inputText = gradioApp().querySelector('#auto_text_lan textarea').value
        if (inputText.length==0) {return}
        const translatedText = local_trans(inputText, false, false, true);
        gradioApp().querySelector('#text_lan_translated textarea').value = translatedText
      }
    );
    gradioApp().getElementById('auto_trans_to_lan').addEventListener('click', () => 
      {
        var inputText = gradioApp().querySelector('#text_lan_translated textarea').value
        if (inputText.length==0) {return}
        const translatedText = local_trans(inputText, false, false, false);
        gradioApp().querySelector('#auto_text_lan textarea').value = translatedText
        
      }
    );

    gradioApp().getElementById('auto_trans_btn').addEventListener('click', () => 
      {
        if (trans_config.doing_list || trans_config.trans_list.size == 0) {
          return;
        }
        gradioApp().getElementById('auto_trans_btn').innerHTML="doing"
        trans_config.doing_list = true
        showProgress(gradioApp().getElementById('auto_textbox_info'), auto_end_auto_trans, (res)=>{
          if (res.trans_succ) {
            gradioApp().querySelector('#auto_textbox_info textarea').value=`Auto Translate Num:${res.trans_succ}`
          }
        })
      }
    );

    trans_config.is_init = true
    return true
  }

  function init() {
    trans_config = get_config()
    trans_config.trans_list = new Set()
    auto_download_localization()
    
    // Add style to dom
    let $styleEL = document.createElement('style');

    if ($styleEL.styleSheet) {
      $styleEL.styleSheet.cssText = customCSS;
    } else {
      $styleEL.appendChild(document.createTextNode(customCSS));
    }
    gradioApp().appendChild($styleEL);
    trans_config.is_init = false
    const observer = new MutationObserver(mutations => {
      if (!trans_config.is_init) add_div()
      if (!trans_config.is_init) return;
      var cur_index = get_tab_index('tabs')
      if (cur_index!=trans_config.cur_tab_index) {
        hide_trans_dialg()
      }
      if (trans_config.doing_list) {
        local_trans_list(trans_config.trans_list)
        trans_config.trans_list = new Set()
        trans_config.doing_list = false
      }
    })

    observer.observe(gradioApp(), {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['title', 'style']
    })
  }

  // Init after page loaded
  document.addEventListener('DOMContentLoaded', init)
})();
