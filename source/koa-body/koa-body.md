## koa-body 源码

> 2018年7月16日

<table>
    <tr>
        <td>引入</td>
        <td>co-body & formidable</td>
    <tr>
    <tr>
        <td>导出</td>
        <td>requestbody( )</td>
    </tr>
</table>

#### api接口

````
   patchNode    {Boolean}        false   Patch request body to Node's ctx.req（请求体映射）
   patchKoa     {Boolean}        true    Patch request body to Koa's ctx.request
   jsonLimit    {String|Integer} 1mb     limit of the JSON body
   formLimit    {String|Integer} 56kb    limit of the form body
   textLimit    {String|Integer} 56kb    limit of the text body
   encoding     {String}         utf-8   Sets encoding for incoming form fields（设置传入表单字段的编码）
   multipart    {Boolean}        false   Parse multipart（多种的） bodies
   urlencoded   {Boolean}        true    Parse urlencoded bodies
   text         {Boolean}        true    Parse text bodies
   json         {Boolean}        true    Parse json bodies
   jsonStrict   {Boolean}        true    Toggles（切换） co-body strict mode; if set to true - only parses arrays or objects
   formidable   {Object}                 Options to pass to（传递到） the formidable multipart parser
   onError      {Function}       throw   Custom（自定义） error handle, if throw an error, you can customize the response - onError(error, context) <-用法
   strict       {Boolean}        true    If enabled, don't parse GET, HEAD, DELETE requests
````

#### 整体结构

````javascript
function requestbody(Options) {
    // 1.options 赋值
    opts.onError = 'onError' in opts ? opts.onError : false;
    opts...

    return function(){
        // 2.从co-body取得格式化后值
        if (!opts.strict || ["GET", "HEAD", "DELETE"].indexOf(ctx.method.toUpperCase()) === -1) {
              if (opts.json && ctx.is('json')) {
                // * buddy - co-body
                bodyPromise = buddy.json(ctx, {
                  encoding: opts.encoding,
                  limit: opts.jsonLimit,
                  strict: opts.jsonStrict
                });
               else if ...
            }
        }

        // 3.将值附给ctx
        return bodyPromise
          .then(function (body) {
            if (opts.patchNode) {
              if (isMultiPart(ctx, opts)) {
                ctx.req.body = body.fields;
                ctx.req.files = body.files;
              } else {
                ctx.req.body = body;
              }
            }
          ctx=...
        }
    }
}
````

#### 库解读

1. 整个库由一个主函数requestbody(options)组成，通过第一次return将数据格式化，第二次return将数据赋给ctx。
2. 整个库作为一个co-body的链接库，将ctx的数据传入co-body中进行格式化，从而转换成可读的格式。
3. 值得学习的地方
 - 三目运算符进行变量初始化
 - try catch custom错误
 - 玩转多个return

`具体内容用法，总结在issue里。`