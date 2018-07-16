'use strict';

// 引入两个模块
var buddy = require('co-body');
var forms = require('formidable');

// 导出requestbody函数
module.exports = requestbody;

function requestbody(opts) {
  // 接受传入的对象，默认为{}
  opts = opts || {};
  // 检测是否传入对应值，若未传入则给默认值
  // * ‘key’ in obj
  // * key是否在该obj里

  // 这一部分很清晰的指明了所有可用api
  // 通过传入以下配置实现相关功能
  opts.onError = 'onError' in opts ? opts.onError : false;
  opts.patchNode = 'patchNode' in opts ? opts.patchNode : false;
  opts.patchKoa = 'patchKoa' in opts ? opts.patchKoa : true;
  opts.multipart = 'multipart' in opts ? opts.multipart : false;
  opts.urlencoded = 'urlencoded' in opts ? opts.urlencoded : true;
  opts.json = 'json' in opts ? opts.json : true;
  opts.text = 'text' in opts ? opts.text : true;
  opts.encoding = 'encoding' in opts ? opts.encoding : 'utf-8';
  opts.jsonLimit = 'jsonLimit' in opts ? opts.jsonLimit : '1mb';
  opts.jsonStrict = 'jsonStrict' in opts ? opts.jsonStrict : true;
  opts.formLimit = 'formLimit' in opts ? opts.formLimit : '56kb';
  opts.queryString = 'queryString' in opts ? opts.queryString : null;
  opts.formidable = 'formidable' in opts ? opts.formidable : {};
  opts.textLimit = 'textLimit' in opts ? opts.textLimit : '56kb';
  opts.strict = 'strict' in opts ? opts.strict : true;

  // patchNode    {Boolean}         Patch request body to Node's ctx.req, default false
  // patchKoa     {Boolean}         Patch request body to Koa's ctx.request, default true
  // jsonLimit    {String|Integer}  The byte (if integer) limit of the JSON body, default 1mb
  // formLimit    {String|Integer}  The byte (if integer) limit of the form body, default 56kb
  // textLimit    {String|Integer}  The byte (if integer) limit of the text body, default 56kb
  // encoding     {String}          Sets encoding for incoming form fields, default utf-8
  // multipart    {Boolean}         Parse multipart bodies, default false
  // urlencoded   {Boolean}         Parse urlencoded bodies, default true
  // text         {Boolean}         Parse text bodies, default true
  // json         {Boolean}         Parse json bodies, default true
  // jsonStrict   {Boolean}         Toggles co-body strict mode; if set to true - only parses arrays or objects, default true
  // formidable   {Object}          Options to pass to the formidable multipart parser
  // onError      {Function}        Custom error handle, if throw an error, you can customize the response - onError(error, context), default will throw
  // strict       {Boolean}         If enabled, don't parse GET, HEAD, DELETE requests, default true

  // 返回一个函数，传入ctx和next
  return function (ctx, next) {
    var bodyPromise;

    // 检测ctx.method
    // 将请求全部转换成大写
    if (!opts.strict || ["GET", "HEAD", "DELETE"].indexOf(ctx.method.toUpperCase()) === -1) {
      try {

        // bodyPromise赋值
        // * 如果开启json检测 && 是否为请求json，request.is(types...)
        // * ctx.is() == request.is()
        // * 请求传入是或否包含content-type字段
        // * 请求的类型
        if (opts.json && ctx.is('json')) {
          // JSON处理
          // * buddy - co-body
          // * 传入对应对象
          bodyPromise = buddy.json(ctx, {
            encoding: opts.encoding,
            limit: opts.jsonLimit,
            strict: opts.jsonStrict
          });
        } else if (opts.urlencoded && ctx.is('urlencoded')) {
          bodyPromise = buddy.form(ctx, {
            encoding: opts.encoding,
            limit: opts.formLimit,
            queryString: opts.queryString
          });
        } else if (opts.text && ctx.is('text')) {
          bodyPromise = buddy.text(ctx, {
            encoding: opts.encoding,
            limit: opts.textLimit
          });
        } else if (opts.multipart && ctx.is('multipart')) {
          bodyPromise = formy(ctx, opts.formidable);
        }
      } catch (parsingError) {
        if (typeof opts.onError === 'function') {
          opts.onError(parsingError, ctx);
        } else {
          throw parsingError;
        }
      }
    }

    // 预防bodyPromise空值情况
    bodyPromise = bodyPromise || Promise.resolve({});

    return bodyPromise.catch(function (parsingError) {
        // opts.onError自定义错误
        if (typeof opts.onError === 'function') {
          opts.onError(parsingError, ctx);
        } else {
          throw parsingError;
        }
        return next();
      })
      .then(function (body) {
        if (opts.patchNode) {
          if (isMultiPart(ctx, opts)) {
            // 值转换
            ctx.req.body = body.fields;
            ctx.req.files = body.files;
          } else {
            // 值转换
            ctx.req.body = body;
          }
        }
        if (opts.patchKoa) {
          if (isMultiPart(ctx, opts)) {
            ctx.request.body = body.fields;
            ctx.request.files = body.files;
          } else {
            ctx.request.body = body;
          }
        }
        return next();
      })
  };
}

/**
 * Check if multipart handling is enabled and that this is a multipart(多部分) request
 *
 * @param  {Object} ctx
 * @param  {Object} opts
 * @return {Boolean} true if request is multipart and being treated as so
 * @api private
 */
function isMultiPart(ctx, opts) {
  return opts.multipart && ctx.is('multipart');
}

/**
 * Donable formidable
 *
 * @param  {Stream} ctx
 * @param  {Object} opts
 * @return {Promise}
 * @api private
 */

function formy(ctx, opts) {
  return new Promise(function (resolve, reject) {
    var fields = {};
    var files = {};
    var form = new forms.IncomingForm(opts);
    form.on('end', function () {
      return resolve({
        fields: fields,
        files: files
      });
    }).on('error', function (err) {
      return reject(err);
    }).on('field', function (field, value) {
      if (fields[field]) {
        if (Array.isArray(fields[field])) {
          fields[field].push(value);
        } else {
          fields[field] = [fields[field], value];
        }
      } else {
        fields[field] = value;
      }
    }).on('file', function (field, file) {
      if (files[field]) {
        if (Array.isArray(files[field])) {
          files[field].push(file);
        } else {
          files[field] = [files[field], file];
        }
      } else {
        files[field] = file;
      }
    });
    if (opts.onFileBegin) {
      form.on('fileBegin', opts.onFileBegin);
    }
    form.parse(ctx.req);
  });
}