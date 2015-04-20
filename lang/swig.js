var lang = fis.compile.lang;
module.exports = function(content, file, conf) {

  conf.left_delimiter = conf.left_delimiter || fis.env().get('settings.swig.left_delimiter') || fis.env().get('settings.template.left_delimiter') || '{%';
  conf.right_delimiter = conf.right_delimiter || fis.env().get('settings.swig.right_delimiter') || fis.env().get('settings.template.right_delimiter') || '%}';

  var ld = fis.util.escapeReg(conf.left_delimiter);
  var rd = fis.util.escapeReg(conf.right_delimiter);

  var reg = new RegExp('({#[\\s\\S]*?#})|(' + ld + '\\s*script(?:(?=\\s)[\\s\\S]*?["\'\\s\\w]' + rd + '|' + rd + '))([\\s\\S]*?)(?=' + ld + '\\s*endscript\\s*' + rd + '|$)|(' + ld + '\\s*style(?:(?=\\s)[\\s\\S]*?["\'\\s\\w\\-]' + rd + '|' + rd + '))([\\s\\S]*?)(?=' + ld + '\\s*endstyle\\s*' + rd + '|$)', 'ig');

  content = content.replace(reg, function(m, comment, script, jscode, style, csscode) {
    if (comment) {
      m = fis.compile.analyseComment(comment);
    } else if (script) {
      m = script + fis.compile.extJs(jscode, null, file);
    } else if (style) {
      m = style + fis.compile.extCss(csscode, null, file);
    }
    return m;
  });

  var reg2 = new RegExp('({#[\\s\\S]*?#})|(?:' + ld + '\\s*(extends|widget|require|uri|html)(.+?)' + rd + ')', 'ig');

  content = content.replace(reg2, function(m, comments, directive, params) {
    if (!comments && params) {
      switch (directive) {
        case 'html':
          params = params.replace(/\sframework\s*=\s*('|")(.+?)\1/ig, function(_, quote, value) {
            return ' framework=' + lang.id.ld + quote + value + quote + lang.id.rd;
          });
          break;

        default:
          params = params.replace(/\s*('|")(.+?)\1/ig, function(_, quote, value) {
            return lang.id.ld + quote + value + quote + lang.id.rd;
          });
          break;
      }

      m = conf.left_delimiter + directive + params + conf.right_delimiter;
    }

    return m;
  });

  return content;
};
