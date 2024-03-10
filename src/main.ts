const $ = (s: string) => document.querySelector(s);

// GENERAL VARIABLES
const REDIRECT_URI = "http://localhost:5173";
let client_id = localStorage.getItem("client_id") || "";
let client_secret = localStorage.getItem("client_secret") || "";

// PAGES
const $login = $("section#login") as HTMLDivElement;
const $app = $("section#app") as HTMLDivElement;
const $dialog = $("div#dialog") as HTMLDivElement;

// LOGIN
const $form = $("form#form-login") as HTMLFormElement;
const $clientIdBtn = $("input#clientID") as HTMLInputElement;
const $clientSecretBtn = $("input#clientSecret") as HTMLInputElement;
const $requestAuthBtn = $("button#requestAuth") as HTMLButtonElement;

// APP
const $showDevices = $("button#showDevices") as HTMLButtonElement;

// MUSIC
const $img = $("img#songImage") as HTMLImageElement;
const $songTitle = $("h1#songTitle") as HTMLParagraphElement;
const $songArtist = $("h2#songArtist") as HTMLParagraphElement;
const $prevSong = $("button#prevSong") as HTMLButtonElement;
const $tooglePlay = $("button#tooglePlay") as HTMLButtonElement;
const $nextSong = $("button#nextSong") as HTMLButtonElement;

// DEVICES
const $selectDevice = $("select#selectDevice") as HTMLSelectElement;

// EVENTS
window.addEventListener("load", handlePageLoad);
$showDevices.addEventListener("click", handleShowDevices);
$form.addEventListener("submit", handleFormSubmit);
$prevSong.addEventListener("click", prevSong);
$tooglePlay.addEventListener("click", tooglePlay);
$nextSong.addEventListener("click", nextSong);

// FUNCTIONS
function handleShowDevices() {
    $dialog.classList.toggle("hidden");
    $dialog.classList.toggle("grid");
}

function handleFormSubmit(e: Event) {
    e.preventDefault();
    client_id = $clientIdBtn.value;
    client_secret = $clientSecretBtn.value;

    if (!(client_id && client_secret)) return;

    $requestAuthBtn.disabled = true;
    localStorage.setItem("client_id", client_id);
    localStorage.setItem("client_secret", client_secret);
    window.location.href = `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=code&redirect_uri=${REDIRECT_URI}&show_dialog=true&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private`;
}

function handlePageLoad() {
    const code = getCode();
    if (code) {
        fetchAccessToken(code);
    } else {
        onPageLoad();
    }
}

function getCode() {
    const queryString = window.location.search;
    if (queryString.length > 0) {
        const urlParams = new URLSearchParams(queryString);
        return urlParams.get("code");
    }
    return null;
}

function fetchAccessToken(code: string) {
    const body = `grant_type=authorization_code&code=${code}&redirect_uri=${REDIRECT_URI}&client_id=${client_id}&client_secret=${client_secret}`;
    callAuthorizationApi(body);
}

function refreshAccessToken() {
    const refresh_token = localStorage.getItem("refresh_token");
    const body = `grant_type=refresh_token&refresh_token=${refresh_token}&client_id=${client_id}`;
    callAuthorizationApi(body);
}

function callAuthorizationApi(body: string) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://accounts.spotify.com/api/token", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader(
        "Authorization",
        `Basic ${btoa(`${client_id}:${client_secret}`)}`
    );

    console.log(`Basic ${btoa(`${client_id}:${client_secret}`)}`);
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}

// eslint-disable-next-line no-unused-vars
function handleAuthorizationResponse(this: XMLHttpRequest) {
    console.log(this.status);
    if (this.status === 200) {
        const data = JSON.parse(this.responseText);
        if (data.access_token) {
            localStorage.setItem("access_token", data.access_token);
        }
        if (data.refresh_token) {
            localStorage.setItem("refresh_token", data.refresh_token);
        }
        onPageLoad();
    } else {
        window.location.href = REDIRECT_URI;
    }
}

function onPageLoad() {
    const access_token = localStorage.getItem("access_token");
    if (access_token) {
        $login.classList.add("hidden");
        $app.classList.remove("hidden");
        refreshDevices();
        currentlyPlaying();
    }
}

function refreshDevices() {
    callApi(
        "GET",
        "https://api.spotify.com/v1/me/player/devices",
        null,
        handleDevicesResponse
    );
}

// eslint-disable-next-line no-unused-vars
function handleDevicesResponse(this: XMLHttpRequest) {
    if (this.status === 200) {
        const data = JSON.parse(this.responseText);
        removeAllItems("devices");
        data.devices.forEach((item: any) => addDevice(item));
    } else if (this.status === 401) {
        refreshAccessToken();
    } else {
        window.location.href = REDIRECT_URI;
    }
}

function addDevice(item: any) {
    const node = document.createElement("option");
    node.value = item.id;
    node.innerHTML = item.name;
    $("select#devices")?.appendChild(node);
}

function callApi(method: string, url: string, body: any, callback: any) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader(
        "Authorization",
        `Bearer ${localStorage.getItem("access_token")}`
    );
    xhr.send(body);
    xhr.onload = callback;
}

function removeAllItems(elementId: string) {
    const node = $(`select#${elementId}`);
    while (node?.firstChild) {
        node?.removeChild(node?.firstChild);
    }
}

function currentlyPlaying() {
    callApi(
        "GET",
        "https://api.spotify.com/v1/me/player/currently-playing",
        null,
        handleCurrentlyPlayingResponse
    );
}

// eslint-disable-next-line no-unused-vars
function handleCurrentlyPlayingResponse(this: XMLHttpRequest) {
    if (this.status === 200) {
        const data = JSON.parse(this.responseText);
        if (data.item) {
            $login.setAttribute("hidden", "");
            $app.removeAttribute("hidden");
            console.log(data.item.album);

            $img.src = data.item.album.images[0].url;
            $songTitle.innerHTML = data.item.album.name;
            $songArtist.innerHTML = data.item.artists[0].name;
        }
    } else if (this.status === 401) {
        refreshAccessToken();
    } else {
        window.location.href = REDIRECT_URI;
    }
}

function tooglePlay() {
    callApi(
        "PUT",
        "https://api.spotify.com/v1/me/player/play",
        null,
        handleApiResponse
    );
}

// eslint-disable-next-line no-unused-vars
function handleApiResponse(this: XMLHttpRequest) {
    if (this.status === 200) {
        console.log(this.responseText);
        setTimeout(currentlyPlaying, 2000);
    } else if (this.status === 204) {
        setTimeout(currentlyPlaying, 2000);
    } else if (this.status === 401) {
        refreshAccessToken();
    } else {
        window.location.href = REDIRECT_URI;
    }
}

function prevSong() {
    callApi(
        "POST",
        "https://api.spotify.com/v1/me/player/previous",
        null,
        handleApiResponse
    );
}

function nextSong() {
    callApi(
        "POST",
        "https://api.spotify.com/v1/me/player/next",
        null,
        handleApiResponse
    );
}

// Call the transfer function wherever you need to transfer playback to a specific device.
// For example:

// ------------------------------------------------
// const client_id = "";
// const client_secret = "";

// const access_token = null;
// const refresh_token = null;
// const currentPlaylist = "";
// const radioButtons = [];

// const AUTHORIZE = "https://accounts.spotify.com/authorize";
// const TOKEN = "https://accounts.spotify.com/api/token";
// const PLAYLISTS = "https://api.spotify.com/v1/me/playlists";
// const DEVICES = "https://api.spotify.com/v1/me/player/devices";
// const PLAY = "https://api.spotify.com/v1/me/player/play";
// const PAUSE = "https://api.spotify.com/v1/me/player/pause";
// const NEXT = "https://api.spotify.com/v1/me/player/next";
// const PREVIOUS = "https://api.spotify.com/v1/me/player/previous";
// const PLAYER = "https://api.spotify.com/v1/me/player";
// const TRACKS = "https://api.spotify.com/v1/playlists/{{PlaylistId}}/tracks";
// const CURRENTLYPLAYING =
//     "https://api.spotify.com/v1/me/player/currently-playing";
// const SHUFFLE = "https://api.spotify.com/v1/me/player/shuffle";

// function onPageLoad() {
//   client_id = localStorage.getItem("client_id");
//   client_secret = localStorage.getItem("client_secret");
//   if (window.location.search.length > 0) {
//     handleRedirect();
//   } else {
//     access_token = localStorage.getItem("access_token");
//     if (access_token == null) {
//       // we don't have an access token so present token section
//       document.getElementById("tokenSection").style.display = "block";
//     } else {
//       // we have an access token so present device section
//       document.getElementById("deviceSection").style.display = "block";
//       refreshDevices();
//       refreshPlaylists();
//       currentlyPlaying();
//     }
//   }
//   refreshRadioButtons();
// }

// function handleRedirect() {
//   let code = getCode();
//   fetchAccessToken(code);
//   window.history.pushState("", "", redirect_uri); // remove param from url
// }

// function getCode() {
//   let code = null;
//   const queryString = window.location.search;
//   if (queryString.length > 0) {
//     const urlParams = new URLSearchParams(queryString);
//     code = urlParams.get("code");
//   }
//   return code;
// }

// function requestAuthorization() {
//   client_id = document.getElementById("clientId").value;
//   client_secret = document.getElementById("clientSecret").value;
//   localStorage.setItem("client_id", client_id);
//   localStorage.setItem("client_secret", client_secret); // In a real app you should not expose your client_secret to the user

//   let url = AUTHORIZE;
//   url += "?client_id=" + client_id;
//   url += "&response_type=code";
//   url += "&redirect_uri=" + encodeURI(redirect_uri);
//   url += "&show_dialog=true";
//   url +=
//     "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private";
//   window.location.href = url; // Show Spotify's authorization screen
// }

// function fetchAccessToken(code) {
//   let body = "grant_type=authorization_code";
//   body += "&code=" + code;
//   body += "&redirect_uri=" + encodeURI(redirect_uri);
//   body += "&client_id=" + client_id;
//   body += "&client_secret=" + client_secret;
//   callAuthorizationApi(body);
// }

// function refreshAccessToken() {
//   refresh_token = localStorage.getItem("refresh_token");
//   let body = "grant_type=refresh_token";
//   body += "&refresh_token=" + refresh_token;
//   body += "&client_id=" + client_id;
//   callAuthorizationApi(body);
// }

// function callAuthorizationApi(body) {
//   let xhr = new XMLHttpRequest();
//   xhr.open("POST", TOKEN, true);
//   xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
//   xhr.setRequestHeader(
//     "Authorization",
//     "Basic " + btoa(client_id + ":" + client_secret)
//   );
//   xhr.send(body);
//   xhr.onload = handleAuthorizationResponse;
// }

// function handleAuthorizationResponse() {
//   if (this.status == 200) {
//     var data = JSON.parse(this.responseText);
//     console.log(data);
//     var data = JSON.parse(this.responseText);
//     if (data.access_token != undefined) {
//       access_token = data.access_token;
//       localStorage.setItem("access_token", access_token);
//     }
//     if (data.refresh_token != undefined) {
//       refresh_token = data.refresh_token;
//       localStorage.setItem("refresh_token", refresh_token);
//     }
//     onPageLoad();
//   } else {
//     console.log(this.responseText);
//     window.location.href = REDIRECT_URI;
//   }
// }

// function refreshDevices() {
//   callApi("GET", DEVICES, null, handleDevicesResponse);
// }

// function handleDevicesResponse() {
//   if (this.status == 200) {
//     var data = JSON.parse(this.responseText);
//     console.log(data);
//     removeAllItems("devices");
//     data.devices.forEach((item) => addDevice(item));
//   } else if (this.status == 401) {
//     refreshAccessToken();
//   } else {
//     console.log(this.responseText);
//     window.location.href = REDIRECT_URI;
//   }
// }

// function addDevice(item) {
//   let node = document.createElement("option");
//   node.value = item.id;
//   node.innerHTML = item.name;
//   document.getElementById("devices").appendChild(node);
// }

// function callApi(method, url, body, callback) {
//   let xhr = new XMLHttpRequest();
//   xhr.open(method, url, true);
//   xhr.setRequestHeader("Content-Type", "application/json");
//   xhr.setRequestHeader("Authorization", "Bearer " + access_token);
//   xhr.send(body);
//   xhr.onload = callback;
// }

// function refreshPlaylists() {
//   callApi("GET", PLAYLISTS, null, handlePlaylistsResponse);
// }

// function handlePlaylistsResponse() {
//   if (this.status == 200) {
//     var data = JSON.parse(this.responseText);
//     console.log(data);
//     removeAllItems("playlists");
//     data.items.forEach((item) => addPlaylist(item));
//     document.getElementById("playlists").value = currentPlaylist;
//   } else if (this.status == 401) {
//     refreshAccessToken();
//   } else {
//     console.log(this.responseText);
//     window.location.href = REDIRECT_URI;
//   }
// }

// function addPlaylist(item) {
//   let node = document.createElement("option");
//   node.value = item.id;
//   node.innerHTML = item.name + " (" + item.tracks.total + ")";
//   document.getElementById("playlists").appendChild(node);
// }

// function removeAllItems(elementId) {
//   let node = document.getElementById(elementId);
//   while (node.firstChild) {
//     node.removeChild(node.firstChild);
//   }
// }

// function play() {
//   let playlist_id = document.getElementById("playlists").value;
//   let trackindex = document.getElementById("tracks").value;
//   let album = document.getElementById("album").value;
//   let body = {};
//   if (album.length > 0) {
//     body.context_uri = album;
//   } else {
//     body.context_uri = "spotify:playlist:" + playlist_id;
//   }
//   body.offset = {};
//   body.offset.position = trackindex.length > 0 ? Number(trackindex) : 0;
//   body.offset.position_ms = 0;
//   callApi(
//     "PUT",
//     PLAY + "?device_id=" + deviceId(),
//     JSON.stringify(body),
//     handleApiResponse
//   );
// }

// function shuffle() {
//   callApi(
//     "PUT",
//     SHUFFLE + "?state=true&device_id=" + deviceId(),
//     null,
//     handleApiResponse
//   );
//   play();
// }

// function pause() {
//   callApi("PUT", PAUSE + "?device_id=" + deviceId(), null, handleApiResponse);
// }

// function next() {
//   callApi("POST", NEXT + "?device_id=" + deviceId(), null, handleApiResponse);
// }

// function previous() {
//   callApi(
//     "POST",
//     PREVIOUS + "?device_id=" + deviceId(),
//     null,
//     handleApiResponse
//   );
// }

// function transfer() {
//   let body = {};
//   body.device_ids = [];
//   body.device_ids.push(deviceId());
//   callApi("PUT", PLAYER, JSON.stringify(body), handleApiResponse);
// }

// function handleApiResponse() {
//   if (this.status == 200) {
//     console.log(this.responseText);
//     setTimeout(currentlyPlaying, 2000);
//   } else if (this.status == 204) {
//     setTimeout(currentlyPlaying, 2000);
//   } else if (this.status == 401) {
//     refreshAccessToken();
//   } else {
//     console.log(this.responseText);
//     window.location.href = REDIRECT_URI;
//   }
// }

// function deviceId() {
//   return document.getElementById("devices").value;
// }

// function fetchTracks() {
//   let playlist_id = document.getElementById("playlists").value;
//   if (playlist_id.length > 0) {
//     url = TRACKS.replace("{{PlaylistId}}", playlist_id);
//     callApi("GET", url, null, handleTracksResponse);
//   }
// }

// function handleTracksResponse() {
//   if (this.status == 200) {
//     var data = JSON.parse(this.responseText);
//     console.log(data);
//     removeAllItems("tracks");
//     data.items.forEach((item, index) => addTrack(item, index));
//   } else if (this.status == 401) {
//     refreshAccessToken();
//   } else {
//     console.log(this.responseText);
//     window.location.href = REDIRECT_URI;
//   }
// }

// function addTrack(item, index) {
//   let node = document.createElement("option");
//   node.value = index;
//   node.innerHTML = item.track.name + " (" + item.track.artists[0].name + ")";
//   document.getElementById("tracks").appendChild(node);
// }

// function currentlyPlaying() {
//   callApi("GET", PLAYER + "?market=US", null, handleCurrentlyPlayingResponse);
// }

// function handleCurrentlyPlayingResponse() {
//   if (this.status == 200) {
//     var data = JSON.parse(this.responseText);
//     console.log(data);
//     if (data.item != null) {
//       document.getElementById("albumImage").src = data.item.album.images[0].url;
//       document.getElementById("trackTitle").innerHTML = data.item.name;
//       document.getElementById("trackArtist").innerHTML =
//         data.item.artists[0].name;
//     }

//     if (data.device != null) {
//       // select device
//       currentDevice = data.device.id;
//       document.getElementById("devices").value = currentDevice;
//     }

//     if (data.context != null) {
//       // select playlist
//       currentPlaylist = data.context.uri;
//       currentPlaylist = currentPlaylist.substring(
//         currentPlaylist.lastIndexOf(":") + 1,
//         currentPlaylist.length
//       );
//       document.getElementById("playlists").value = currentPlaylist;
//     }
//   } else if (this.status == 204) {
//   } else if (this.status == 401) {
//     refreshAccessToken();
//   } else {
//     console.log(this.responseText);
//     window.location.href = REDIRECT_URI;
//   }
// }

// function saveNewRadioButton() {
//   let item = {};
//   item.deviceId = deviceId();
//   item.playlistId = document.getElementById("playlists").value;
//   radioButtons.push(item);
//   localStorage.setItem("radio_button", JSON.stringify(radioButtons));
//   refreshRadioButtons();
// }

// function refreshRadioButtons() {
//   let data = localStorage.getItem("radio_button");
//   if (data != null) {
//     radioButtons = JSON.parse(data);
//     if (Array.isArray(radioButtons)) {
//       removeAllItems("radioButtons");
//       radioButtons.forEach((item, index) => addRadioButton(item, index));
//     }
//   }
// }

// function onRadioButton(deviceId, playlistId) {
//   let body = {};
//   body.context_uri = "spotify:playlist:" + playlistId;
//   body.offset = {};
//   body.offset.position = 0;
//   body.offset.position_ms = 0;
//   callApi(
//     "PUT",
//     PLAY + "?device_id=" + deviceId,
//     JSON.stringify(body),
//     handleApiResponse
//   );
//   //callApi( "PUT", SHUFFLE + "?state=true&device_id=" + deviceId, null, handleApiResponse );
// }

// function addRadioButton(item, index) {
//   let node = document.createElement("button");
//   node.className = "btn btn-primary m-2";
//   node.innerText = index;
//   node.onclick = function () {
//     onRadioButton(item.deviceId, item.playlistId);
//   };
//   document.getElementById("radioButtons")?.appendChild(node);
// }
