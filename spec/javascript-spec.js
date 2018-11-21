var patterns = require('../')
var should = require('should')

var cStyleMultiline = require('../languages/patterns/common/c-style.js').multiLine()
var cStyleSingleLine = require('../languages/patterns/common/c-style.js').singleLine()

/* global describe */
/* global it */
// /* global xdescribe */
// /* global xit */
/* global expect */

describe('comment-patterns', function () {
  it('should return the Handlebars-patterns for .hbs-files', function (done) {
    patterns('test.hbs').should.eql(
      {
        name: 'Handlebars',
        nameMatchers: ['.handlebars', '.hbs'],
        multiLineComment: [
          { end: '-->', middle: '', start: '<!--' },
          { apidoc: true, end: '--}}', middle: '', start: '{{!--' },
          { end: '}}', middle: '', start: '{{!' }
        ]
      }
    )
    done()
  })

  it('should return the JavaScript-patterns for .js-files', function (done) {
    patterns('test.js').should.eql(
      {
        name: 'JavaScript',
        nameMatchers: ['.js'],
        multiLineComment: cStyleMultiline,
        singleLineComment: cStyleSingleLine
      }
    )
    done()
  })

  it('should return the JavaScript-patterns for .js-files, if called a second time', function (done) {
    patterns('test.js').should.eql(
      {
        name: 'JavaScript',
        nameMatchers: ['.js'],
        multiLineComment: cStyleMultiline,
        singleLineComment: cStyleSingleLine
      }
    )
    done()
  })

  it('should work for php. The regex-matcher should be replaced by string-matchers', function (done) {
    patterns('test.php3').should.eql(
      {
        name: 'PHP',
        nameMatchers: ['.php', '.php3', '.php4', '.php5', '.fbp'],
        multiLineComment: cStyleMultiline,
        singleLineComment: cStyleSingleLine
      }
    )
    done()
  })

  it('should work for scala. The regex-matcher should be replaced by string-matchers', function (done) {
    patterns('test.scala').should.eql(
      {
        name: 'Scala',
        nameMatchers: ['.scala'],
        multiLineComment: cStyleMultiline,
        singleLineComment: cStyleSingleLine
      }
    )
    done()
  })
})

describe('comment-patterns.regex', function () {
  it('should provide a regex that matches a multi-line-comment', function (done) {
    var r = patterns.regex('test.js')
    var match = r.regex.exec(' /**\n  * Test\n  */\ncode\n')
    match[r.cg.indent].should.eql(' ')
    match[r.cg.wholeComment].should.eql('/**\n  * Test\n  */')
    match[r.cg.contentStart].should.eql('\n  * Test\n  ')
    should.not.exist(match[r.cg.contentStart + 1])
    should.not.exist(match[r.cg.contentStart + 2])

    // Checking apidoc property
    r.info[0].apidoc.should.eql(true)
    done()
  })

  it('should provide a regex that matches a multi-line-comment (/*...*/)', function (done) {
    var r = patterns.regex('test.js')
    var match = r.regex.exec(' /*\n  * Test\n  */\ncode\n')
    match[r.cg.indent].should.eql(' ')
    match[r.cg.wholeComment].should.eql('/*\n  * Test\n  */')
    should.not.exist(match[r.cg.contentStart])
    match[r.cg.contentStart + 1].should.eql('\n  * Test\n  ')
    should.not.exist(match[r.cg.contentStart + 2])

    // Checking apidoc property
    should.not.exist(r.info[1].apidoc)
    done()
  })

  it('should provide a regex that matches a single-line-comment', function (done) {
    var r = patterns.regex('test.js')
    var match = r.regex.exec('// line 1\n// line 2\ncode\n')
    match[r.cg.indent].should.eql('')
    match[r.cg.wholeComment].should.eql('// line 1\n// line 2\n')
    should.not.exist(match[r.cg.contentStart])
    should.not.exist(match[r.cg.contentStart + 1])
    match[r.cg.contentStart + 2].should.eql('// line 1\n// line 2\n')

    // Checking apidoc property
    should.not.exist(r.info[2].apidoc)
    done()
  })

  it('should provide a regex that matches a single-line-comment with indent', function (done) {
    var r = patterns.regex('test.js')
    var match = r.regex.exec(' // line 1\n // line 2\n code\n')
    match[r.cg.indent].should.eql(' ')
    match[r.cg.wholeComment].should.eql('// line 1\n // line 2\n')
    should.not.exist(match[r.cg.contentStart])
    should.not.exist(match[r.cg.contentStart + 1])
    match[r.cg.contentStart + 2].should.eql('// line 1\n // line 2\n')
    done()
  })

  it('should provide a regex that matches multi-line ruby comments', function (done) {
    var r = patterns.regex('test.rb')
    var match = r.regex.exec('\n=begin\nline 1\n=end\n')
    match[r.cg.contentStart].should.eql('\nline 1\n')
    done()
  })

  it('should provide a regex that matches multi-line python comments', function (done) {
    var r = patterns.regex('test.py')
    var match = r.regex.exec('"""\nline 1\n"""')
    match[r.cg.contentStart].should.eql('\nline 1\n')

    match = r.regex.exec('variable="""\n multiline string\n"""')
    should.not.exist(match)
    done()
  })
})

describe('comment-patterns.codeContext', function () {
  it('should regognize a function in a js-string', function (done) {
    var codeContext = patterns.codeContext('test.js')
    var result = codeContext.detect('function name(param1, param2)', 2)
    result.should.eql({
      begin: 2,
      name: 'name',
      original: 'function name(param1, param2)',
      params: ['param1', 'param2'],
      string: 'name()',
      type: 'function statement'
    })
    done()
  })

  it('should throw an error, if no code-context parser is defined for the language', function (done) {
    try {
      // non existing languauge
      patterns.codeContext('test.scss')
    } catch (e) {
      e.message.should.equal("Cannot find module './languages/code-context/scss.js'")
      done()
    }
  })

  it('should work correctly for functions in object properties', function (done) {
    var detector = patterns.codeContext('test.js')
    expect(detector.detect('key: function(a,b) {', 2)).toEqual({
      begin: 2,
      type: 'function expression',
      name: 'key',
      params: ['a', 'b'],
      string: 'key()',
      original: 'key: function(a,b) {'
    })
    done()
  })

  it('should work correctly for functions in object properties', function (done) {
    var detector = patterns.codeContext('test.js')
    expect(detector.detect('this.key = function (a,b) {', 2)).toEqual({
      begin: 2,
      type: 'method',
      receiver: 'this',
      name: 'key',
      params: ['a', 'b'],
      string: 'this.key()',
      original: 'this.key = function (a,b) {'
    })
    done()
  })
})
