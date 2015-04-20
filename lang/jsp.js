module.exports = function(content, file, conf) {

  var reg = /(<%--(?!\[)[\s\S]*?(?:--%>|$))|(<fis\:script(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/fis\:script\s*>|$)|(<fis\:style(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(?=<\/fis\:style\s*>|$)/ig;

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

  var reg2 = /(<%--(?!\[)[\s\S]*?(?:--%>|$))|<fis\:(html|widget|extends|require|uri|script|style)([^>]+)/ig;

  content = content.replace(reg, function(m, comment, type, attributes) {
    if (!comment) {
      m = m.replace(/(id|name|framework|src|href)=('|")(.*?)\2/ig, function(_, attr, quote, value) {
        switch (attr) {
          case 'src':
          case 'href':
            return attr + '=' + lang.uri.ld + quote + value + quote + lang.uri.rd;
            break;

          default:
            return attr + '=' + lang.id.ld + quote + value + quote + lang.id.rd;
        }
      });
    }
  });

  return content;
};
