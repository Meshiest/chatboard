/*
var webtorrent = new WebTorrent({
  dht: false,
  maxConns: 8,
  announce: [
    "udp://tracker.openbittorrent.com:80",
    "udp://tracker.internetwarriors.net:1337",
    "udp://tracker.leechers-paradise.org:6969",
    "udp://tracker.coppersurfer.tk:6969",
    "udp://exodus.desync.com:6969",
    "wss://tracker.webtorrent.io",
    "wss://tracker.btorrent.xyz",
    "wss://tracker.openwebtorrent.com",
    "wss://tracker.fastcast.nz"
  ],
  tracker: true
})*/

(function(){

var canvas = $('#canvas')
var ctx = canvas[0].getContext('2d')


var Tracker = require('bittorrent-tracker/client')
var hat = require('hat')

var peers = []
var state = {}
var peerId = new Buffer(hat(160), 'hex')

var tracker = new Tracker({
  peerId: peerId,
  announce: [
    "udp://tracker.openbittorrent.com:80",
    "udp://tracker.internetwarriors.net:1337",
    "udp://tracker.leechers-paradise.org:6969",
    "udp://tracker.coppersurfer.tk:6969",
    "udp://exodus.desync.com:6969",
    "wss://tracker.webtorrent.io",
    "wss://tracker.btorrent.xyz",
    "wss://tracker.openwebtorrent.com",
  ],
  infoHash: new Buffer(20).fill('p2p-game')
})

console.log('I am ', tracker.peerId)

tracker.start()

window.broadcast = function (obj) {
  peers.forEach(function (peer) {
    if (peer.connected)
      peer.send(JSON.stringify(obj))
  })
}

var messages = []

var point = {x: 0.5, y: 0.5}

function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

canvas.on('mousemove', function(e){
  point.x = e.pageX/canvas.width()
  point.y = e.pageY/canvas.height()
  debounce(updateHoverText(), 50)
})

function updateHoverText () {
  broadcast({
    type: 'typing',
    x: point.x,
    y: point.y,
    text: $('#msg').val()
  })
}

$('#msg').on('keyup', function(){
  debounce(updateHoverText(), 50)
})

window.sendChat = function (msg) {
  if(!msg) {  
    var msg = $('#msg').val()
    $('#msg').val('')
  }
  console.log('sending ',msg)
  var x = Math.random() * 0.8 + 0.1
  var y = Math.random() * 0.8 + 0.1
  x = point.x
  y = point.y
  point.y += 13/canvas.height()
  broadcast({type: 'chat', content: msg, x: x, y: y})
  messages.push({type: 'chat', content: msg, x: x, y: y, peer: tracker.peerId})
}

function addMessage (msg, x, y, color) {
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = "13px Arial"
  ctx.fillStyle = color
  ctx.fillText(msg, canvas.width() * x, canvas.height() * y)
}

tracker.on('peer', function (peer) {
  for(var i in peers) {
    if(peers[i].id == peer.id) {
      return
    }
  }
  peers.push(peer)

  if(peer.connected)
    onConnect()
  else
    peer.once('connect', onConnect)

  function onConnect () {
    

    peer.on('data', onMessage)
    peer.on('close', onClose)
    peer.on('error', onClose)
    peer.on('end', onClose)
    console.log("Connection!", peer.id)
  }

  function onClose () {
    console.log("Disconnect:", peer.id)
    peer.removeListener('data', onMessage)
    peer.removeListener('close', onClose)
    peer.removeListener('error', onClose)
    peer.removeListener('end', onClose)
    peers.splice(peers.indexOf(peer), 1)
  }

  function onMessage (data) {
    try {
      data = JSON.parse(data)
    } catch (err) {
      console.error(err.message)
      return
    }
    data.peer = peer.id

    console.log(data)
    switch(data.type) {
    case 'chat':
      peer.typing = undefined
      messages.push(data)
      break
    case 'typing':
      peer.typing = data
    }
  }
})

var lastTick = Date.now()
function tick () {
  var time = Date.now()
  var delta = (time-lastTick)/1000
  lastTick = time
  ctx.canvas.width = canvas.width()
  ctx.canvas.height = canvas.height()

  ctx.save()
  ctx.strokeStyle = '#000'
  ctx.strokeWidth = 3
  ctx.beginPath()
  ctx.arc(point.x * canvas.width(), point.y * canvas.height(), 5, 0, Math.PI*2)
  ctx.stroke()
  ctx.restore()

  ctx.textBaseline = "middle"
  for(var i in messages) {
    var data = messages[i]
    ctx.textAlign = "center"
    addMessage(data.content, data.x, data.y, "#"+data.peer.substr(0, 6))
  }
  ctx.textAlign = "left"
  ctx.font = "13px Arial"
  ctx.fillStyle = "#"+tracker.peerId.substr(0, 6)
  ctx.fillText("You: "+tracker.peerId, 10, 20)

  ctx.save()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = "13px Arial"
  ctx.strokeStyle = "#"+tracker.peerId.substr(0, 6)
  ctx.strokeWidth = 1
  ctx.strokeText($('#msg').val(), canvas.width() * point.x, canvas.height() * point.y)
  ctx.restore()

  for(var i in peers) {
    var peer = peers[i]
    if(!peer.connected)
      continue
    ctx.fillStyle = "#"+peer.id.substr(0, 6)
    ctx.fillText(peer.id, 10, i*20 + 40)

    if(peer.typing) {
      ctx.save()
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.font = "13px Arial"
      ctx.strokeStyle = "#"+peer.id.substr(0, 6)
      ctx.strokeWidth = 1
      ctx.strokeText(peer.typing.text, canvas.width() * peer.typing.x, canvas.height() * peer.typing.y)
      ctx.restore()
    }
  }
}

window.onload = function () {
  setInterval(tick, 0)
}

})()
