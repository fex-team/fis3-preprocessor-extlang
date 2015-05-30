var lang = fis.compile.lang;

module.exports = function(content, file, conf) {

  var reg = /(<!--(?!\[)[\s\S]*?(?:-->|$)|\{\{--[\s\S]*?(?:--\}\}|$))|(@script\s*\(.*\))([\s\S]*?)(?=@endscript|$)|(@style\s*\(.*\))([\s\S]*?)(?=@endstyle|$)/ig;

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

  var reg2 = /(<!--(?!\[)[\s\S]*?(?:-->|$)|\{\{--[\s\S]*?(?:--\}\}|$))|@(extends|require|uri|url|framework|widget|script|style|include)\s*\(([^\)]+)/ig;

  content = content.replace(reg2, function(m, comments, directive, params) {
    if (!comments && params) {

      params = params.replace(/\s*('|")(.+?)\1/ig, function(_, quote, value) {
        return lang.id.wrap(quote + value + quote);
      });

      m = '@' + directive + '(' + params;
    }

    return m;
  });

  return '@require(\'' + file.id + '\')' + content;
};
