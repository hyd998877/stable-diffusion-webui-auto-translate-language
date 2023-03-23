# 使用的谷歌翻译接口
from pygoogletranslation import Translator

class GoogleTranslate():

    def __init__(self):
        print('init GoogleTranslate')
        # proxy = {
        #     'http': "127.0.0.1:1080"
        # }
        # self.translator = Translator(proxies=proxy)
        self.translator = Translator()

    def translate(self, input_string, input_lang=None, output_lang=None, retry=False):
        res_txt = ''
        if input_lang == None:
        	input_lang = ''
        try:
        	res_txt = self.translator.translate(input_string, dest=output_lang).text
        except Exception as e:
        	print(e)
            
        return res_txt

if __name__ == "__main__":
	tran = GoogleTranslate()
	print('res', tran.translate("test", output_lang='zh-CN'))