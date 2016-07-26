var lang = fis.compile.lang;

module.exports = function (content, file, conf) {
    conf.blockStart = conf.blockStart || fis.env().get('nunjucks.blockStart') || '{%';
    conf.blockEnd = conf.blockEnd || fis.env().get('nunjucks.blockEnd') || '%}';
    conf.commentStart = conf.commentStart || fis.env().get('nunjucks.commentStart') || '{#';
    conf.commentEnd = conf.commentEnd || fis.env().get('nunjucks.commentEnd') || '#}';

    var bs = fis.util.escapeReg(conf.blockStart) + '\\s*'; // 标签起始符
    var be = '\\s*' + fis.util.escapeReg(conf.blockEnd); // 标签结束符
    var cs = fis.util.escapeReg(conf.commentStart); // 注释起始符
    var ce = fis.util.escapeReg(conf.commentEnd); // 注释结束符
    var reg = new RegExp('(' + cs + '[\\s\\S]*?' + ce + '|$)|(' + bs + 'script(?:(?=\\s)[\\s\\S]*?["\'\\s\\w]' + be + '|' + be + '))([\\s\\S]*?)(?=' + bs + 'endscript' + be + '|$)|(' + bs + 'style(?:(?=\\s)[\\s\\S]*?["\'\\s\\w\\-]' + be + '|' + be + '))([\\s\\S]*?)(?=' + bs + 'endstyle' + be + '|$)', 'ig');

    content = content.replace(reg, function (m, comment, script, jscode, style, csscode) {
        if (comment) {
            m = fis.compile.analyseComment(comment);
        } else if (script) {
            m = fis.compile.xLang(script, jscode, file, 'js');
        } else if (style) {
            m = fis.compile.xLang(style, csscode, file, 'css');
        }
        return m;
    });

    var reg2 = new RegExp('(' + cs + '[\\s\\S]*?(?:' + ce + '|$))|(?:' + bs + '(extends|widget|require|uri|html)(.+?)' + be + ')', 'ig'); // todo: 不确定uri 和 widget的用法

    content = content.replace(reg2, function (m, comments, directive, params) {
        if (!comments && params) {
            switch (directive) {
                case 'html':
                    params = params.replace(/\sframework\s*=\s*('|")(.+?)\1/ig, function (_, quote, value) {
                        return ' framework=' + lang.id.ld + quote + value + quote + lang.id.rd;
                    });
                    break;

                case 'extends':
                    params = params.replace(/('|")(.+?)\1/ig, function (_, quote, value) {
                        return lang.id.ld + quote + value + quote + lang.id.rd;
                    });
                    break;

                default:
                    params = params.replace(/\sname\s*=\s*('|")(.+?)\1/ig, function (_, quote, value) {
                        return ' name=' + lang.id.ld + quote + value + quote + lang.id.rd;
                    });
                    break;
            }
            m = conf.blockStart + ' ' + directive + params + ' ' + conf.blockEnd;
        }

        return m;
    });

    // 自动插入 require 自己的代码。
    if (file.extras.isPage) {
        // todo: 有可能判断到别处的extends
        var reg3 = new RegExp(bs + 'extends\\s+'), pos;

        if (reg3.test(content)) {
            pos = content.search(new RegExp(bs + 'endblock' + be));
        } else {
            pos = content.search(new RegExp(bs + 'endbody' + be));
        }

        if (pos > 0) {
            var insert = conf.blockStart + ' require name="' + file.id + '" ' + conf.blockEnd;

            content = content.substring(0, pos) + insert + content.substring(pos);
        }
    }

    return content;
};