var lang = fis.compile.lang;
var inited = false;
module.exports = function(content, file, conf) {

  inited || ((function() {
    lang.add('tpl');
    fis.on('standard:restore:tpl', onStandardRestore);
  })(), inited = true);

  conf.left_delimiter = conf.left_delimiter || fis.env().get('smarty.left_delimiter') || '{%';
  conf.right_delimiter = conf.right_delimiter || fis.env().get('smarty.right_delimiter') || '%}';

  var ld = fis.util.escapeReg(conf.left_delimiter);
  var rd = fis.util.escapeReg(conf.right_delimiter);
  var reg = new RegExp('(' + ld + '\\*[\\s\\S]*?\\*' + rd + '|$)|(' + ld + 'script(?:(?=\\s)[\\s\\S]*?["\'\\s\\w]' + rd + '|' + rd + '))([\\s\\S]*?)(?=' + ld + '\\/script' + rd + '|$)|(' + ld + 'style(?:(?=\\s)[\\s\\S]*?["\'\\s\\w\\-]' + rd + '|' + rd + '))([\\s\\S]*?)(?=' + ld + '\\/style\\s*' + rd + '|$)', 'ig');
  content = content.replace(reg, function(m, comment, script, jscode, style, csscode) {
    if (comment) {
      m = fis.compile.analyseComment(comment);
    } else if (script) {
      m = fis.compile.xLang(script, jscode, file, 'js');
      // m = script + fis.compile.extJs(jscode, null, file);
    } else if (style) {
      m = fis.compile.xLang(style, csscode, file, 'css');
      // m = style + fis.compile.extCss(csscode, null, file);
    }
    return m;
  });

  var reg2 = new RegExp('(' + ld + '\\*[\\s\\S]*?(?:\\*' + rd + '|$))|(?:' + ld + '\\s*(extends|widget|require|uri|html)(.+?)' + rd + ')', 'ig');

  content = content.replace(reg2, function(m, comments, directive, params) {
    if (!comments && params) {
      switch (directive) {
        case 'extends':
          if (conf.skipExtendReplacement || file.skipExtendReplacement) {
            return m;
          }

          params = params.replace(/\sfile\s*=\s*('|")(.+?)\1/ig, function(_, quote, value) {
            return ' file=' + lang.tpl.ld + quote + value + quote + lang.tpl.rd;
          });
          break;

        case 'html':
          params = params.replace(/\sframework\s*=\s*('|")(.+?)\1/ig, function(_, quote, value) {
            return ' framework=' + lang.id.ld + quote + value + quote + lang.id.rd;
          });
          break;

        default:
          params = params.replace(/\sname\s*=\s*('|")(.+?)\1/ig, function(_, quote, value) {
            return ' name=' + lang.id.ld + quote + value + quote + lang.id.rd;
          });
          break;
      }

      m = conf.left_delimiter + directive + params + conf.right_delimiter;
    }


    return m;
  });

  // 自动插入 require 自己的代码。
  if (file.extras.isPage) {
      var reg3 = new RegExp(ld + 'extends\\s+'), pos;

      if(reg3.test(content)){
          pos = content.lastIndexOf(conf.left_delimiter + '/block' + conf.right_delimiter);
      } else {
          pos = content.indexOf(conf.left_delimiter + '/body' + conf.right_delimiter);
      }
      
      if(pos > 0){
          var insert = conf.left_delimiter + "require name='" + file.id + "'" + conf.right_delimiter;
          content = content.substring(0, pos) + insert + content.substring(pos);
      }
  }

  return content;
};

function onStandardRestore(message) {
  var info = fis.project.lookup(message.value, message.file);

  if (info.file) {
    message.ret = info.quote + info.id.replace(/\:/g, '/') + info.quote;
  } else {
    message.ret = message.value;
  }
};
