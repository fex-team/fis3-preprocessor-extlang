var lang = fis.compile.lang;
var parse = require('../lib/parser/parse.js');
var _ = fis.util;

module.exports = function(content, file, conf) {
  content = transform(content, file, conf);

  var reg2 = /(#\*[\s\S]*?(?:\*#|$)|##[^\n\r\f]*)|(?:#(require|extends|widget|html|filter|uri|script|style)\s*\(\s*('|")(.*?)\3)/ig;

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

function transform(content, file, conf) {
  var customBlocks = _.assign({
    html: true,
    head: true,
    body: true,
    script: true,
    style: true,
    extends: true,
    block: true,
    filter: true
  }, conf.customBlocks);

  var asts = parse(content, customBlocks, true);

  // return JSON.stringify(asts, null, 4);

  asts = travel(asts, {
    enter: function(node) {
      if (node.type === 'script' || node.type === 'style') {
        var str = astToCode(node.body);
        node.body = [fis.compile[node.type === 'style' ? 'extCss' : 'extJs'](str, null, file)];
      } else if (node.type === 'extends' || node.type === 'html' || node.type === 'filter') {
        node.body.push('\n  ## auto inject by fis3-preprocess-extlang\n  #require("' + file.id + '")\n');
      }
    }
  });

  return astToCode(asts);
}

function travel(ast, iterator) {
  return ast.map(function(item) {
    return _travel(item, [], iterator);
  });
};

function _travel(ast, paths, iterator) {

  if (typeof ast === 'string') {
    if (iterator.enter) {
      ast = iterator.enter(ast, paths) || ast;
    }

    if (iterator.leave) {
      ast = iterator.leave(ast, paths) || ast;
    }

    return ast;
  } else if (Array.isArray(ast)) {
    var root = ast.shift();

    root.body = ast;

    if (iterator.enter) {
      root = iterator.enter(root, paths) || root;
    }

    var fn = _travel[root.type];
    fn && (root = fn.call(_travel, root, paths, iterator) || root);

    if (root.body) {
      paths.push(root);

      root.body = root.body.map(function(item) {
        return _travel(item, paths, iterator);
      });

      paths.pop();
    }

    if (iterator.leave) {
      root = iterator.leave(root, paths) || root;
    }

    root = [root].concat(root.body);
    delete root.body;
    return root;
  } else {
    if (iterator.enter) {
      ast = iterator.enter(ast, paths) || ast;
    }

    var fn = _travel[ast.type];
    fn && (ast = fn.call(_travel, ast, paths, iterator) || ast);

    if (iterator.leave) {
      ast = iterator.leave(ast, paths) || ast;
    }

    return ast;
  }
}

_travel['if'] = function(ast, paths, iterator) {
  // 不递归进入 if 内容。
};

var astToCode = (function() {
  function codeGen(asts) {
    return asts.map(codeGen.gen).join('');
  };

  codeGen.gen = function(item) {
    if (typeof item === 'string') {
      return item;
    } else if (Array.isArray(item)) {
      var block = item.shift();
      var fn = codeGen[block.type] || codeGen.block;
      return fn.call(codeGen, block, item);
    } else {
      var fn = codeGen[item.type] || codeGen['default'];
      return fn.call(codeGen, item);
    }
  };

  codeGen.block = function(block, items) {
    return '#' + block.type +
      '(' + (block.args ? block.args.map(codeGen.gen).join(' ') : '') +
      ')' + items.map(codeGen.gen).join('') + '#end';
  };

  codeGen['default'] = function(item) {
    return item.value;
  };

  codeGen['if'] = function(block, items) {
    return '#' + block.type + '(' + codeGen.gen(block.condition) + ')' +
      items.map(codeGen.gen).join('') + '#end';
  };

  codeGen['elseif'] = function(item) {
    return '#' + item.type + '(' + codeGen.gen(item.condition) + ')';
  };

  codeGen['else'] = function(item) {
    return '#' + item.type;
  };

  codeGen['foreach'] = function(block, items) {
    return '#' + block.type + '($' + block.to + ' in ' + codeGen.gen(block.from) + ')' +
      items.map(codeGen.gen).join('') + '#end';
  };

  codeGen.math = function(item) {
    var expression = item.expression;

    if (expression.length === 1) {

      if (item.operator === 'parenthesis') {
        return '(' + codeGen.gen(expression[0])  + ')';
      }

      return (item.operator === 'not' ? '!' : item.operator === 'minus' ? '-' : item.operator) + '' + codeGen.gen(expression[0]);
    }

    return codeGen.gen(expression[0]) + ' ' + item.operator + ' ' + codeGen.gen(expression[1]);
  }

  codeGen.references = function(item) {
    return item.leader +
      (item.isWraped ? '{' : '') + item.id +
        (item.path ? item.path.map(codeGen.gen).join('') : '') +
      (item.isWraped ? '}' : '');
  };

  codeGen.macro_call = function(item) {
    return '#' + item.id + '(' + (item.args ? item.args.map(codeGen.gen).join(' ') : '') +
        ')';
  };

  codeGen.string = function(item) {
    return '"' + item.value.replace(/"/g, '\\"') + '"';
  };

  codeGen.integer = function(item) {
    return item.value;
  };

  codeGen.property = function(item) {
    return '.' + item.id;
  };

  codeGen['method'] = function(item) {
    return '.' + item.id + '(' + (item.args ? item.args.map(codeGen.gen).join(', ') : '') + ')';
  };

  codeGen['set'] = function(item) {
    var equal = item.equal;
    return '#set(' + codeGen.gen(equal[0]) + ' = ' + codeGen.gen(equal[1]) + ')';
  };

  codeGen['array'] = function(item) {
    if (item.isRange) {
      return '[' +
        (typeof item.value[0] === 'string' ? item.value[0] : codeGen.gen(item.value[0])) +
        '..' +
        (typeof item.value[1] === 'string' ? item.value[1] : codeGen.gen(item.value[1])) +
        ']';
    }

    return '[' + item.value.map(codeGen.gen).join(', ') + ']';
  };

  codeGen['index'] = function(item) {
    return '[' + codeGen.gen(item.id) + ']'
  };

  codeGen['raw'] = function(item) {
    return '#[[' + item.value + ']]#';
  };

  codeGen['macro'] = function(block, items) {
    return '#' + block.type +
      '(' + block.id + ' ' + (block.args ? block.args.map(codeGen.gen).join(' ') : '') +
      ')' + items.map(codeGen.gen).join('') + '#end';
  };

  codeGen['map'] = function(item) {
    var items = [];
    var value = item.value;

    Object.keys(value).forEach(function(key) {
      items.push('"' + key + '": ' + codeGen.gen(value[key]));
    });

    return '{' + items.join(', ')  + '}';
  };

  codeGen['define'] = function(block, items) {
    return '#' + block.type +
      '( $' + block.id + ' )' + items.map(codeGen.gen).join('') + '#end';
  };

  return codeGen;
})();
