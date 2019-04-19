var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var mime = require('mime');
var ejs = require('ejs');
var sqlite3 = require('sqlite3').verbose();

var routs = {
    '/': index,
    '/index': index,
    '/new': newp,
    '/new/post': new_post,
    '/get': get,
    '/edit': edit,
    '/edit/post': edit_post,
    '/delete': del,
    '/delete/post': del_post
};

function index(param, request, response)
{
    var db = createDB();
    db.all("SELECT * FROM posts", function(err, rows) {
        render('template/index.ejs', request, response, {posts: rows});
        db.close();
    });
}

function newp(param, request, response)
{
    render('template/new.ejs', request, response);
}

function new_post(param, request, response)
{
    // Handle Post...
    var db = createDB();

    var post = param['post'];

    db.run('INSERT INTO posts(post) VALUES(?)', [post], function(err) {
        if(err)
        {
            console.log(err.message);
        }
        else
        {
            console.log('A row has been inserted into table posts width rowid '+ this.lastID);
            db.close();
            redirect('/new', request, response);
        }
    });
}

function get(params, request, response)
{
    var db = createDB();
    var id = params['id'];

    db.get('SELECT * FROM posts WHERE id=?', [id], function(err, row) {
        if(err)
        {
            console.log(err);
        }
        else
        {
            render('template/get.ejs', request, response, {post: row});
            db.close();
        }
    });
}

function edit(params, request, response)
{
    var db = createDB();
    var id = params['id'];

    db.get('SELECT * FROM posts WHERE id=?', [id], function(err, row) {
        if(err)
        {
            console.log(err);
        }
        else
        {
            render('template/edit.ejs', request, response, {post: row});
            db.close();
        }
    });
}

function edit_post(params, request, response)
{
    var db = createDB();

    var id = params['id'];
    var post = params['post'];
    // { [Error: SQLITE_RANGE: column index out of range] errno: 25, code: 'SQLITE_RANGE' }
    db.run("UPDATE posts SET post=$post WHERE id=$id", {$id: id, $post: post}, function(err) {
        if(err)
        {
            console.error(err);
            redirect('/edit?id='+id, request, response);
        }
        else
        {
            console.log('Row(s) updated: ' + this.changes);
            db.close();
            redirect('/edit?id='+id, request, response);
        }
    });
}

function del(params, request, response)
{
    var db = createDB();

    var id = params['id'];

    db.get('SELECT * FROM posts WHERE id=?', [id], function(err, row) {
        if(err)
        {
            console.error(err);
        }
        else
        {
            render('template/delete.ejs', request, response, {post: row});
            db.close();
        }
    });
}

function del_post(params, request, response)
{
    var db = createDB();
    var id = params['id'];

    db.run('DELETE FROM posts WHERE id=?', [id], function(err) {
        if(err)
        {
            console.error(err);
            redirect('/', request, response);
        }
        else
        {
            console.log('Row(s) deleted '+this.changes);
            db.close();
            redirect('/', request, response);
        }
    })
}

function listener(request, response)
{
    if(request.method == 'POST')
    {
        //console.log('TODO: Create Post');
        var u = request.url;
        u = url.parse(u).pathname;

        var body = '';

        request.on('data', function(data) {
            body += data;
        });

        request.on('end', function() {
            var params = qs.parse(body);

            if(routs[u])
            {
                routs[u](params, request, response);
            }
            else
            {
                redirect('/', request, response);
            }
        });
    }
    else if(request.method == 'GET')
    {   
        //console.log('TODO: Create Get');
        var u = request.url;
        var params = url.parse(u, true).query;
        u = url.parse(u).pathname;

        if(routs[u])
        {
            routs[u](params, request, response);
        }
        else if(u.startsWith('/static'))
        {
            console.log(mime.getType(u));
            try 
            {
                //ar contents = fs.readFileS
                fs.readFile('.'+u, function(err, data) {
                    if(err)
                    {
                        console.error(err);
                    }
                    else
                    {
                        response.writeHead(200, {'Content-Type': mime.getType(u), 'Content-Length': data.length});
                        response.end(data);
                    }
                });
            }
            catch(e)
            {
                console.log(e);
            }
        }
        else 
        {
            var contents = '<!doctype html><html><head><title>404 Error</title></head><body><h1>404 Error</h1><p>Resource doesnt exist</p></body></html>';
            response.writeHead(404, {'Content-Type': 'text/html', 'Content-Length': contents.length});
            response.end(contents);
        }
    }
}

function render(path, request, response, obj=null)
{
    if(obj)
    {
        ejs.renderFile(path, obj, function(err, str) {
            if(err)
            {
                console.error(err);
            }
            else
            {
                response.end(str);
            }
        });
    }
    else
    {
        ejs.renderFile(path, function(err, str) {
            if(err)
            {
                console.error(err);
            }
            else
            {
                response.end(str);
            }
        })
    }
}

function redirect(path, request, response)
{
    response.writeHead(302, {'Location': path});
    response.end();
}

function createDB()
{
    return new sqlite3.Database('base.db');
}

var server = http.createServer(listener);

server.listen(8080);
console.log('Running Application at http://localhost:8080');