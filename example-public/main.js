
const socketUrl = `${(location.protocol === 'https:') ? 'wss://' : 'ws://'}${location.hostname}${location.port ? `:${location.port}` : ''}/malafat`;

document.querySelectorAll('[data-malafat]').forEach((el) => {
    Malafat.fromElement(el, socketUrl)
})

