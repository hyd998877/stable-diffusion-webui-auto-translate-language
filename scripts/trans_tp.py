import translators as ts
# ts.preaccelerate()

def init_transers(transers):
	for x in range(len(ts.server.__all__)):
	    if x>2:
	        transers.append('tp_'+ts.server.__all__[x])

class TpTranslate():
    def __init__(self, translator='bing'):
        print('init TpTranslate')
        self.translator = translator

    def translate(self, input_string, input_lang=None, output_lang=None, retry=False):
        res_txt = ''
        if input_lang == None:
        	input_lang = 'auto'
        try:
        	res_txt = ts.translate_text(input_string, from_language=input_lang, to_language=output_lang, translator=self.translator)
        except Exception as e:
        	print(e)
            
        return res_txt

if __name__ == "__main__":
	tran = TpTranslate()
	print('res', tran.translate("test", output_lang='zh-CN'))