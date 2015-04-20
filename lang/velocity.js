var lang = fis.compile.lang;
module.exports = function(content, file, conf) {

  var labelParser = require('fis-velocity-label-parser');
  var ret = labelParser(content, conf);
  var content_new = fis.util.clone(content);

  fis.util.map(ret, function(k, v) {
    if (v.start_label == '#script') {
      var js_before = content.substring(v.content_start_index, v.content_end_index);
      var js_after = fis.compile.extJs(js_before, null, file);
      content_new = content_new.replace(js_before, js_after);
    } else if (v.start_label == '#style') {
      var css_before = content.substring(v.content_start_index, v.content_end_index);
      var css_after = fis.compile.extCss(css_before, null, file);
      content_new = content_new.replace(css_before, css_after);
    }
  });
  content = content_new;

  var reg2 = /(#\*[\s\S]*?(?:\*#|$)|##[^\n\r\f]*)|(?:#(require|extends|widget|html|uri|script|style)\s*\(\s*('|")(.*?)\3)/ig;

  content = content.replace(reg2, function(m, comment, directive, quote, url) {
    if (url) {
      m = '#' + directive + '(' + lang.id.ld + quote + url + quote + lang.id.rd;
    } else if (comment) {
      m = fis.compile.analyseComment(m);
    }

    return m;
  });

  return content;
};
