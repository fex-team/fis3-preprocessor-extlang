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

  // 控制 资源加载顺序
  var reg3 = /(<!--(?!\[)[\s\S]*?(?:-->|$)|\{\{--[\s\S]*?(?:--\}\}|$))|(@extends\s*\([^\)]+)|(<html[^>]*>)/ig;
  var hasExtends = false;
  var hasHtml = false;

  content = content.replace(reg3, function(m, comments, extend, html) {
    if (comments) {
      return m;
    } else if (extend && !hasExtends) {
      hasExtends = true;
    } else if (html && !hasHtml) {
      hasHtml = true;
    }

    return m;
  });

  if (!hasExtends && (hasHtml || file.isPage || file.extras && file.extras.isPage)) {
    var reg4 = /(<!--(?!\[)[\s\S]*?(?:-->|$)|\{\{--[\s\S]*?(?:--\}\}|$))|(@section\s*\(\s*('|")fis_resource\3\s*\))(.*?)@show/ig;
    var hasSection = false;

    content = content.replace(reg4, function(m, comments, prefix, quote, body) {
      if (comments || hasSection) {
        return m;
      }

      hasSection = true;
      return prefix + body + '@require(\'' + file.id + '\')' + '@show';
    });

    hasSection || (content = '@section("fis_resource")@require(\'' + file.id + '\')@show\n' + content);
  } else {
    content += '@section("fis_resource")@parent @require(\'' + file.id + '\')@stop';
  }

  return content;
};
