Malafat = (function() {

    class TreeUI {
        constructor(element, onSelectFn) {
            this.element = element
            this.element.className += " malafat-file-tree"

            this.onSelectFn = onSelectFn
        }

        render(data) {
            // destory all old elements
            while (this.element.firstChild) {
                this.element.removeChild(this.element.firstChild);
            }
            //
            this.element.appendChild(this.createTree(data))
        }
        folderIcon(data) {
            if ( data.name === ".git" ) {
                return {
                    open: "fab fa-git green",
                    closed: "fab fa-git-square green"
                }
            }
            return {
                open: "fas fa-folder-open orange",
                closed: "fas fa-folder orange"
            }
            /*    switch (extension) {
                    case "git":
                        return "fas fa-code-branch"
                    default:
                        return "fas fa-folder-open"
                }*/
        }
        fileIcon(data) {
            if (data.children) {
                return ""
            }

            const colorClasses = ["green", "blue", "red", "orange", "darkgreen", "purple", "pink"]
            //
            let filename = data.name.toLowerCase()
            let extension = filename.split('.').pop();

            //

            let iconClasses = ""

            switch (extension) {
                case "pdf":
                    iconClasses += "fas fa-file-pdf ";
                    break
                case "md":
                    iconClasses += "fas fa-book"
                    break
                case "txt":
                case "gitignore":
                    iconClasses += "fas fa-file-alt"
                    break
                case "js":
                case "json":
                case "css":
                case "py":
                case "sh":
                case "bash":
                case "html":
                case "c":
                case "cxx":
                    iconClasses += "fas fa-file-code"
                    break
                case "zip":
                case "z":
                case "tar":
                case "gz":
                case "rar":
                case "xz":
                    iconClasses += "fas fa-file-archive"
                    break
                case "jpg":
                case "jpeg":
                case "exif":
                case "tiff":
                case "tif":
                case "gif":
                case "bmp":
                case "png":
                case "ppm":
                case "pgm":
                case "pbm":
                case "pnm":
                    iconClasses += "fas fa-file-image"
                    break
                default:
                    iconClasses += "fas fa-file"
                    break
            }

            // predefined
            switch (extension) {
                case "pdf":
                    iconClasses += " red "
                    break
                default:
                    let hash = 0;
                    for (let i = 0; i < extension.length; i++) {
                        hash += Math.pow(extension.charCodeAt(i) * 31, extension.length - i);
                        hash = hash & hash; // Convert to 32bit integer
                    }
                    iconClasses += " " + colorClasses[Math.abs(hash) % colorClasses.length] + ' '
            }

            return iconClasses
        }

        hiddenFile (data) {
            if (data.name.charAt(0) === '.') {
                return "hidden-file"
            }
            return ""
        }

        createTree(data) {
            let prevSelected = undefined

                    var spanStyle = ''

            let createTreeHelper = (data) => {
                let li = document.createElement("li")

                let icon = document.createElement("i")
                li.appendChild(icon)

                let span = document.createElement("span")
                span.appendChild(document.createTextNode(data['name']))
                li.appendChild(span)

                if (!data.children) {
                    icon.setAttribute("class", this.fileIcon(data))

                    span.addEventListener("click", () => {
                        if (prevSelected) {
                            prevSelected.setAttribute("class", "")
                        }
                        span.setAttribute("class", "selected")
                        prevSelected = span
                        //
                        this.onSelectFn(data)

                        console.log(data)
                    })
                } else {
                    let ul = document.createElement("ul")
                    let iconClasses = this.folderIcon(data)

                    icon.setAttribute("class", iconClasses.open)
                    icon.addEventListener("click", () => {
                        if (ul.style.display === "none") {
                            icon.setAttribute("class", iconClasses.open)
                            ul.style.display = "block";
                        } else {
                            icon.setAttribute("class", iconClasses.closed)
                            ul.style.display = "none";
                        }
                    })
                    for (let i = 0; i < data.children.length; i++) {
                        ul.appendChild(createTreeHelper(data.children[i]))
                    }
                    li.appendChild(ul)
                }

                // deal with hidden files
                span.className += " "+this.hiddenFile(data)
                icon.className += " "+this.hiddenFile(data)

                return li
            }

            let ul = document.createElement("ul")
            ul.appendChild(createTreeHelper(data))
            return ul
        }
    }
    class FileViewer {
        static fromElement(element, socketUrl) {
            let dirpath = element.dataset.dir
            let isWatch = ((typeof element.dataset['watch']) !== 'undefined' ? true : false)
            let isCreate = ((typeof element.dataset['create']) !== 'undefined' ? true : false)
            //
            const socket = new WebSocket(socketUrl);
            //
            let fv = new FileViewer({
                element: element,
                dir: dirpath,
                requestFileContentFn: (f) => {
                    socket.send(JSON.stringify({
                        "type": "get-file-content",
                        "path": f,
                    }))
                },
                requestFileTreeFn: () => {
                    socket.send(JSON.stringify({
                        "type": "get-file-tree"
                    }))
                },
            })
            //
            socket.onmessage = function(ev) {
                let response = JSON.parse(ev['data'])
                switch (response.type) {
                    case "file-tree":
                        fv.recieveFileTree(response['file-tree'])
                        break;
                    case "file-content":
                        fv.recieveFileContent(response['path'], response['content'])
                        break;
                    case "file-changed":
                        fv.notifyFileChanged(response['path'])
                        break
                }
            }
            //
            socket.onopen = () => {
                console.log('websocket is connected ...')
                socket.send(JSON.stringify({
                    "type": "init",
                    "path": dirpath,
                    "watch": isWatch,
                    "create": isCreate
                }))
                fv.newTree()
            }
        }

        constructor(options) {
            this.element = options.element
            this.dir = options.dir

            this.requestFileContentFn = options.requestFileContentFn // (f) => {}
            this.requestFileTreeFn = options.requestFileTreeFn // (dir) => {}
            //
            this.openfile = undefined

            //// prepare element
            this.element.setAttribute('style', "display:flex;flex-wrap:nowrap;")

            let leftpane = document.createElement('div')
            leftpane.setAttribute('style', "overflow-y:scroll")
            this.element.appendChild(leftpane)

            let rightpane = document.createElement('div')
            rightpane.setAttribute('style', "width:100%; margin-left:20px")
            let filetextEl = document.createElement("TEXTAREA")
            this.contentTextAreaElement = filetextEl
            filetextEl.setAttribute("readonly", "true")
            filetextEl.setAttribute("class", "malafat-file-content-textarea")
            rightpane.appendChild(filetextEl)
            this.element.appendChild(rightpane)


            //
            //

            this.treeui = new TreeUI(leftpane, (data) => {
                this.openfile = data['path']
                this.requestFileContentFn(data['path'])
            })

        }
        newTree() {
            this.requestFileTreeFn()
        }
        recieveFileContent(filepath, content) {
            if (this.openfile === filepath) {
                this.contentTextAreaElement.value = content
            }
        }
        recieveFileTree(filetree) {
            this.treeui.render(filetree);
        }
        notifyFileChanged(filepath) {
            if (this.openfile === filepath) {
                this.requestFileContentFn(filepath)
            }
        }
    }


    //
    return FileViewer
}())
