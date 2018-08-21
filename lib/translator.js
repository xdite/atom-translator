'use babel';

import TranslationProvider from './TranslationProvider';

import { CompositeDisposable } from 'atom';

// 全角转为半角
function ToCDB(str) {
    var tmp = "";
    for(var i=0;i<str.length;i++){
        if (str.charCodeAt(i) == 12288){
            tmp += String.fromCharCode(str.charCodeAt(i)-12256);
            continue;
        }
        if(str.charCodeAt(i) > 65280 && str.charCodeAt(i) < 65375){
            tmp += String.fromCharCode(str.charCodeAt(i)-65248);
        }
        else{
            tmp += String.fromCharCode(str.charCodeAt(i));
        }
    }
    return tmp
}

export default {

  subscriptions: null,
  translationProvider: null,

  config: {
      source: {
          title: "Select Translation Service Provider",
          type: 'string',
          description: 'Translation Service Provider',
          default: 'Yandex',
          enum: ['Yandex','Google Translation']
      },
      lang: {
         title: 'Translate To Language',
         description: 'Specify which language to translate by default (e.g. `ar` or `en`). Arabic will be default',
         type: 'string',
         default: 'ar'
     },
     key: {
         title: 'Translation API Key',
         description: 'Set Translation API Key Provided By your translation service provider. https://github.com/bhaskardabhi/atom-translator#api-key',
         type: 'string',
         default: ''
     }
   },

  activate(state) {
      this.translationProvider = new TranslationProvider();

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
        'atom-translator:toggle': () => this.toggle()
    }));
  },

  deactivate() {
      if(this.translationProvider){
          this.translationProvider.destroy();
      }

      this.subscriptions.dispose();
  },

  serialize() {
  },

  toggle() {
      if(!this.translationProvider.getDefaultTraslationLang()){
          atom.notifications.addWarning("Setup default translation language");
          return true;
      }
      if(!this.translationProvider.getKey()){
          atom.notifications.addWarning("Setup Yandex Translation key");
          return true;
      }

     var editor = atom.workspace.getActiveTextEditor();

     if(editor && editor.getLastSelection() && editor.getLastSelection().getText()){
        let selection = editor.getLastSelection();
        if (!selection.getText()) return false;
     let contexts = selection.getText().split(/\n+/);

        let that = this;
        let i = 0;
        let retryCount = 0;
        let timer = 0;

        function translate(contexts) {

            let content = '';
            let paragraph = contexts[i];

            if( i === (contexts.length - 1)) {
                return atom.notifications.addSuccess("翻译完成!");
            }
            console.log(paragraph)
            if (!paragraph) {
                ++i;
                translate(contexts);
            }

            atom.notifications.addInfo(`正在翻译第 ${i+1} / ${contexts.length} 段落`);

            return that.translationProvider.translate(that.translationProvider.getDefaultTraslationLang(), paragraph, function (word) {
                if (!word) {
                    if (retryCount === 3) {
                        atom.notifications.addError('翻译错误，中断翻译!');
                        return selection.insertText(ToCDB(contexts.slice(i, contexts.length).join("\n\n")));
                    }
                    clearTimeout(timer)
                    timer = setTimeout(() => {
                        translate(contexts);
                    }, 3000);
                    return false;
                }

                let translatedParagraph = paragraph + "\n\n" + word + "\n\n";
                ++i;
                content = ToCDB(translatedParagraph);
                selection.insertText(content);
                translate(contexts);
            })
        }
        translate(contexts);
     }
 },
};
