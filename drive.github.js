/*

http://stackoverflow.com/questions/9272535/how-to-get-a-file-via-github-apis
https://developer.github.com/v3/repos/contents/
Tener en cuenta que : This API supports files up to 1 megabyte in size.

*/


define([
    "jwebkit",
    "jwebkit.ui",
    "jwebdesk",
//    "./github-master/github.js",
//    "./gatekeeper-master/server.js"
], function(jwk, ui, jwebdesk) {
    var $  = jwk.query;    
    // console.log(arguments);
    
    var github_api_url = "https://api.github.com";
    var github_url = "https://github.com";
    
    function github_get (url) {
        console.log("GET", url);
        var self = this;
        return $.ajax({
            url: url,
            type: "GET",
            beforeSend: function (request) {
                request.setRequestHeader("Accept", "application/json, text/javascript, */*; q=0.01");
                request.setRequestHeader("Authorization", "token " + self.client.access_token);
            }
        }).then(function () {
            console.log(arguments);
            var result = jwk.Deferred();
            return result.resolve.apply(result, arguments).promise();
        });
    }    
    
    function github_put (url, data) {
        console.log("PUT", url, [data]);   
        var self = this;
        return $.ajax({
            url: url,
            type: "PUT",
            beforeSend: function (request) {
                request.setRequestHeader("Accept", "application/json, text/javascript, */*; q=0.01");
                request.setRequestHeader("Authorization", "token " + self.client.access_token);
            },
            data: JSON.stringify(data),
            // processData: false
        })
    }    
    
    function github_post (url, data) {
        //console.log("POST", url, [data], "SIMULADO");   
        //return $.Deferred().resolve(({id:"POST SIMULADO"})).promise();
        console.log("POST", url, [data]);
        var self = this;
        return $.ajax({
            url: url,
            type: "POST",
            beforeSend: function (request) {
                request.setRequestHeader("Accept", "application/json, text/javascript, */*; q=0.01");
                request.setRequestHeader("Authorization", "token " + self.client.access_token);
            },
            data: JSON.stringify(data),
            // processData: false
        })
    }    
    
    
    function GitHub(owner) {
        jwebdesk.Drive.call(this, owner, {
            title: "GitHub",
            id: "github"
        });        
    }
    GitHub.prototype = new jwebdesk.Drive();
    GitHub.prototype.constructor = GitHub;
    
    // Private auxiliar functions ---------------------------------------------------------------    
    // Esta función recibe la data de un readdir del api de GitHub de forma cruda como la maneja GitHub.
    // Hay que hacer una traducción de esta data a un formato unificado    
    function to_nodes (entries, parent) {
        var self = this;
        var nodes = [];
        for (var i=0;  i<entries.length; i++) {
            var entry = entries[i];
            var node = this.create_node({
                source: entry,
                name: entry.name,
                path: entry.path,
                isFolder: entry.isFolder,
                mimeType: entry.mimeType,
                hasThumbnail: entry.hasThumbnail,
                parent: parent,
                // TODO: hay que formatear este campo
                modifiedAt: entry.modifiedAt,
                size: entry.size
            });
            nodes.push(node);
        }            
        
        return nodes;
    }
    
    function assert_logged() {    
        if (!this.flag("logged")) {
            this.login();
        }
        return this.wait_flag("logged");
    }

    
    // -------------------------------------------------------------------------------------------
    if (window.opener && jwk.urlParam("package")) {
        var view = {
            "disable_selection": true,
            "ui_type": "panel.emboss",
            "namespace": "jwk-ui",
            "class": "expand",
            "text": "Connecting to GitHub..."
        }

        var tree = jwk.ui.display_component(view);
        var proxy = jwk.global.proxy("drive-github-popup");
        var apptoken = jwk.urlParam("apptoken");
        var redirect_plane = jwebdesk.baseURL + "/jwebdesk.php?package=github-drive&apptoken="+apptoken;
// console.error("------------>", redirect_plane);        
// alert(redirect_plane);
        var redirect_uri = encodeURIComponent(redirect_plane);
        var code = jwk.urlParam("code");
        var final = jwk.urlParam("final");
        if (!code & !final) {
            if (!apptoken) {
                console.error("ERROR: apptoken needed to login to GitHub");
            } else {
                // TODO agregar el parámetro state que es un random string.
                // es solo para evitar verificar que la contestación viene de github y no de otro lado
                // la idea es generar un string, guardarla en jwebdesk.localStore y luego cuando recibís el code junto con el state de vuelta verificás que sea el mismo state
                var url = 
                    github_url + "/login/oauth/authorize?" +
                    "client_id=" + github.id + "&" +
                    "redirect_uri="+ redirect_uri + "&" +
                    "scope=repo,user,delete_repo"; // <---- el scope hace cambien los permisos que tenés. También cambia 

                window.location = url;
            }
        } else if (code) {            
            
            var url = jwebdesk.baseURL + "/package/viter/github-drive/token.php?code="+code+"&client_id="+github.id+"&client_secret="+github.secret;
            $.ajax({url:url}).done(function(access_token) {
                console.error("El proxy de github retornó", arguments);
                tree.text = "CONECTADO con GITHUB!";
                tree.paint();
                proxy.trigger("logged", {access_token:access_token});
            });            
            
        } else if (final) {
            console.error("FINAL!", window.location.href);
        }
    }
            
    
    // GitHub API functions ----------------------------------------------------------------------    
    GitHub.prototype.login = function (do_popup) {
        var self = this;
        var win;
        var deferred = jwk.Deferred();
        if (self.client) {
            // 
            return deferred.resolve();
        }
        var timer = false;
        var proxy = jwk.global.proxy("drive-github-popup");
        proxy.on("logged", function (n,e) {
            console.log("hago un close del popup");                        
            self.client = {access_token: e.access_token};
            jwk.setCookie("github-access-token", e.access_token);
            // console.error("self.access_token: ", self.client.access_token);
            deferred.resolve(e);
            self.flag_on("logged");
            if (window['popup_github']) window['popup_github'].close();
            delete window['popup_github'];
        });
        var url = jwebdesk.serverURL + "?package=github-drive&apptoken=" + this._apptoken;
        win = jwk.popupWindow(url, "GitHub login", 1000, 600);
        window['popup_github'] = win;
        return deferred;
    }      
    
    GitHub.prototype.logout = function () {}
    
    GitHub.prototype.user = function () {}

    GitHub.prototype.root = function () {}

    GitHub.prototype.writeFile = function (node, data, params) {
        var deferred = jwk.Deferred();
        var self = this;
        var file_replaced_sha = node.sha;            
        
        assert_logged.call(this).done(function() {
            if (true) {
                console.assert(self && self.client, "ERROR: this node does not have the GitHub.Client instantiated");
                
                var levels = node.path.split("/");
                console.assert(!node.isFolder, "ERROR: node " + node.path + " is a folder");
                console.assert(levels.length >= 4, [levels]);
                
                var path = "";
                var i = node.path.indexOf(levels[3]);
                i = node.path.indexOf("/", i);
                path = node.path.substring(i+1);
                
                // https://developer.github.com/v3/repos/contents/
                url = github_api_url + "/repos/" + levels[1] + "/" + levels[2] + "/contents/" + path; 
                /*if (levels[3] != "master") */ url += "?ref=" + levels[3];
                
                var params = {
                    path: path,
                    message: "commit contents: ",
                    content: btoa(data),                    
                    branch: levels[3],
                    sha: file_replaced_sha
                }                
                
                github_put.call(self, url, params).then(function(result) {
                    console.assert(node.data == data, [result, node]);
                    console.assert(node.size == result.content.size, [result, node]);
                    node.sha = result.content.sha;
                    console.error(arguments);
                    deferred.resolve(node);
                }).fail(function () {
                    deferred.reject("ERROR");
                });
                
                // Esto supuestamente impide que se realicen varios fetchs del mismo nodo seguidos (uno tras otro)
                node.data_requested = true;
                setTimeout(function () {
                    node.data_requested = false;
                }, 3000);
                
            }            
        });
        
        return deferred.promise();        
    }
    
    GitHub.prototype.readFile = function (node) {
        var deferred = jwk.Deferred();
        var self = this;
        
        assert_logged.call(this).done(function() {
            if (!node.data_fetched && !node.data_requested) {            
                console.assert(self && self.client && self.client.access_token, "ERROR: no access_token");
                var levels = node.path.split("/");
                console.assert(!node.isFolder, "ERROR: node " + node.path + " is a folder");
                console.assert(levels.length >= 4, [levels]);
                
                var path = "";            
                var i = node.path.indexOf(levels[3]);
                i = node.path.indexOf("/", i);
                path = node.path.substring(i+1);
                url = github_api_url + "/repos/" + levels[1] + "/" + levels[2] + "/contents/" + path; 
                if (levels[3] != "master") url += "?ref=" + levels[3];
                
                github_get.call(self, url).then(function(result) {
                    if (result.content) {
                        var data = atob(result.content);
                        node.setData(data);
                        node.sha = result.sha;
                        console.log("SHA: " + result.sha + " " + url);
                        console.assert(node.size == result.size, [node.size,result.size, node, result]);                    
                        deferred.resolve(node.data, node);
                    } else {
                        console.error("ERROR: trying to get content of file "  + node.path, [node, path, url, result]);
                    }
                    // deferred.resolve(node.children, node);
                });                    
                
                // Esto supuestamente impide que se realicen varios fetchs del mismo nodo seguidos (uno tras otro)
                node.data_requested = true;
                setTimeout(function () {
                    node.data_requested = false;
                }, 3000);
                
            } else if (node.data_fetched && node.data) {
                deferred.resolve(node.data, node);
            } else {
                console.error("????", [node]);
            }
            
        });
        
        return deferred.promise();        
    }
    
    GitHub.prototype.readdir = function (node) {
        var self = this;
        var url;
        var deferred = jwk.Deferred();
        if (!node.isFolder) return deferred.reject().promise();
        if (node.children) return deferred.resolve(node).promise();
        
        assert_logged.call(this).done(function() {            
            if (!node.fetched && !node.requested) {
                console.assert(self && self.client && self.client.access_token, "ERROR: no access_token");
                console.assert(node.isFolder, "ERROR: node must be a isFolder");
                var levels = node.path.split("/");
                
                if (node.path == "/") {
                    // We need to show 1 folder with the name of the user and as many folders as organizations the user has
                    url = github_api_url + "/user";
                    
                    github_get.call(self, url).then(function(data) {
                        self.client = jwk.extend(self.client, {
                            id: data.id,
                            login: data.login
                        });                        
                        url = github_api_url + "/users/" + self.client.login + "/orgs";                        
                        return github_get.call(self, url);
                    }).then(function(orgs) {
                        console.assert(Array.isArray(orgs), "ERROR: array expected but got " + typeof orgs, arguments);
                        self.client.orgs = orgs;
                        var entries = [];
                        orgs.push({login:self.client.login, id:self.client.id});
                        for (var i=0; i<orgs.length; i++) {
                            var entry = orgs[i];
                            entries.push({
                                name: entry.login,
                                path: "/" + entry.login,
                                isFolder: true,
                                modifiedAt: 0,
                                size: 0                                
                            });                            
                        }                        
                        node.setChildren(to_nodes.call(self, entries, node));
                        deferred.resolve(node.children, node);
                    }).fail(function (){
                        console.error("ERROR :", arguments);
                    });
                } else if (levels.length == 2) {
                    // Here we are in a organization or user folder. So we need to list the repositories inside this folder.
                    if (levels[1] == self.client.login) {
                        url = github_api_url + "/user/repos";                         
                        // self.client.repos = repos;                        
                    } else {
                        url = github_api_url + "/orgs/" + levels[1] + "/repos";                         
                    }
                    github_get.call(self, url).then(function(repos) {
                        console.assert(Array.isArray(repos), "ERROR: array expected but got " + typeof repos, arguments);                            
                        var entries = [];                            
                        for (var i=0; i<repos.length; i++) {
                            var entry = repos[i];

                            entries.push({
                                name: entry.name,
                                path: node.path + "/" + entry.name,
                                isFolder: true,
                                modifiedAt: 0,
                                size: 0                                
                            });                            

                        }
                        node.children = to_nodes.call(self, entries, node);                        
                        deferred.resolve(node.children, node);
                    })
                } else if (levels.length == 3) {
                    // We are inside a repositorie folder but not specified the branch.
                    // We need to list all the branches a repositorie has.
                    url = github_api_url + "/repos/" + levels[1] + "/" + levels[2] + "/branches"; 
                    github_get.call(self, url).then(function(branches) {
                        console.assert(Array.isArray(branches), "ERROR: array expected but got " + typeof branches, arguments);                            
                        var entries = [];                                                    
                        for (var i=0; i<branches.length; i++) {                            
                            var entry = branches[i];                                                        
                            entries.push({
                                name: entry.name,
                                path: node.path + "/" + entry.name,
                                isFolder: true,
                                modifiedAt: 0,
                                size: 0                                
                            });                            
                        }
                        return node.children = to_nodes.call(self, entries, node);                        
                    }).then(function (nodes){                        
                        console.assert(Array.isArray(nodes), arguments);
                        for (var i = 0; i<nodes.length; i++) {
                            (function (_node){
                                var lvl = _node.path.split("/");
                                url = github_api_url + "/repos/" + lvl[1] + "/" + lvl[2]+ "/branches/" + lvl[3];
                                github_get.call(self, url).then (function(branch) {
                                    _node.set("branch", branch, {no_parse: true});
                                })                                
                            })(nodes[i]);
                        }
                        console.log(arguments);
                        deferred.resolve(node.children, node);
                    })
                } else if (levels.length >= 4) {                    
                    // /repos/:owner/:repo/contents/:path
                    var path = "";
                    if (levels.length > 4) {
                        var i = node.path.indexOf(levels[3]);
                        i = node.path.indexOf("/", i);
                        path = node.path.substring(i+1);
                    }
                    url = github_api_url + "/repos/" + levels[1] + "/" + levels[2] + "/contents/" + path; 
                    if (levels[3] != "master") url += "?ref=" + levels[3];
                    
                    github_get.call(self, url).then(function(files) {
                        var entries = [];                                                    
                        for (var i=0; i<files.length; i++) {                            
                            var entry = files[i];                                                        
                            entries.push({
                                name: entry.name,
                                path: node.path + "/" + entry.name,
                                isFolder: entry.type != "file" && entry.type !="submodule",
                                modifiedAt: 0,
                                size: 0                                
                            });                            
                        }
                        node.children = to_nodes.call(self, entries, node);
                        deferred.resolve(node.children, node);
                    });                    
                    
                } else {
                    console.error("ERROR: ",[levels, node]);
                    console.assert(Array.isArray(levels), [levels])
                }
                
                // deferred.resolve(node);
                
                // Esto supuestamente impide que se realicen varios fetchs del mismo nodo seguidos (uno tras otro)
                node.requested = true;
                setTimeout(function () {
                    node.requested = false;
                }, 3000);
                
            } else if (node.fetched) {
                deferred.resolve(node.children, node);
            } else {
                node.wait_flag("children").done(function(node) {
                    deferred.resolve(node.children, node);
                });
            }
        });        
        

        return deferred.promise();        
    }
    
    GitHub.prototype.createChild = function (node, entry) {
        var self = this;
        var deferred = jwk.Deferred();
        console.log("GitHub.prototype.createChild", node.level(), node.path, entry.name, entry);
        switch(node.level()) {
            case 0: 
                console.error("NOT IMPLEMENTED YET", arguments)
                break;
            case 1:
                if (entry.isFolder && typeof entry.name == "string") {
                    // me mandan crear un repositorio con el nombre entry.name para el owner node.name
                    
                    var params = {
                        name: entry.name,
                        description: "jwebdesk package repository",
                        auto_init: true
                    }
                    
                    var url = github_api_url;
                    if (self.client.login == node.name) {
                        // /user/repos
                        url += "/user/repos";
                    } else {
                        // /orgs/:org/repos
                        url += "/orgs/" + node.name + "/repos";
                    }
                    
                    github_post.call(self, url, params).then(function(result) {
                        if (result.id) {
                            entry.path = node.path + "/" + entry.name;
                            var child = self.create_node(entry);
                            // Esto es una folder y la acabo de crear así que ya le encajo la lista vacía de children para que no los pia a github.
                            child.children = [];
                            child.fetched = true;
                            //
                            node.add_node(child);
                        }
                        deferred.resolve(child);
                    });                      
                    
                }
                break;
            case 2: 
                // {path: "/templates/package/simple-app/main.js", name: "main.js", isFolder: false, size: 1383}
                // /Viterbo/mi_primer_paquetote_2
                // PUT /repos/:owner/:repo/contents/:path
                if (!entry.isFolder) {
                    
                    var params = {
                        path: entry.name,
                        message: "",
                        content: btoa(entry.data)
                    }                      
                                        
                    // /repos/:owner/:repo/contents/:path
                    var url = github_api_url + "/repos" + node.path +"/contents/" + params.path;                    
                    
                    // console.log("------------------------->", url, [params]);
                    github_put.call(self, url, params).then(function(result) {
                        console.log("GITHUB: ", result);
                        if (result.commit) {
                            entry.path = node.path + "/" + entry.name;
                            var child = self.create_node(entry);
                            child.setData(entry.data);
                            child.sha = result.commit.sha;
                            node.add_node(child);
                        }
                        deferred.resolve(child);
                    });                    
                    
                } else {    
                    entry.path = node.path + "/" + entry.name;
                    var child = self.create_node(entry);                        
                    node.add_node(child);
                    deferred.resolve(child);    
                }
                            
                break;
            default:
                console.error("NOT IMPLEMENTED YET", node.level(), arguments)
        }
        return deferred.promise();        
    }

    GitHub.prototype.getAPI = function () {  }

    GitHub.prototype.link = function () { }
    
    GitHub.prototype.thumbnail = function () {  }        
    
    return GitHub;
});