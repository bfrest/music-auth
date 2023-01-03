require("dotenv").config();
const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const axios = require("axios");

const PORT = process.env.PORT;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CLIENT_REDIRECT = process.env.CLIENT_REDIRECT;

const app = express();
const router = express.Router();

var spotifyApi = new SpotifyWebApi({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: CLIENT_REDIRECT,
});

// helper function
const randomString = (length) => {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const stateKey = "spotify_auth_state";

app.get("/login", (req, res, next) => {
  const state = randomString(16);
  res.cookie(stateKey, state);

  const scope =
    "user-read-private user-top-read user-read-email user-read-playback-state user-read-currently-playing user-library-modify playlist-modify-private streaming user-read-recently-played";

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: CLIENT_REDIRECT,
    state: state,
    scope: scope,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

app.get("/callback", (req, res) => {
  const code = req.query.code || null;

  axios({
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    data: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: CLIENT_REDIRECT,
    }).toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${new Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
  })
    .then((response) => {
      if (response.status == 200) {
        const { access_token, refresh_token, expires_in } = response.data;

        const queryParams = new URLSearchParams({
          access_token,
          refresh_token,
          expires_in,
        });

        // redirect to react app
        res.redirect(`http://localhost:5173/?${queryParams}`);

        // pass along tokens in query params
      } else {
        res.redirect(`/?${new URLSearchParams({ error: "invalid_token" }).toString()}`);
      }
    })
    .catch((error) => {
      res.send(error);
    });
});

app.get("/refresh_token", (req, res) => {
  const { refresh_token } = req.query;

  axios({
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    data: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    })
      .then((response) => {
        res.send(response.data);
      })
      .catch((error) => {
        res.send(error);
      })
      .toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${new Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
  })
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => {
      res.send(error);
    });
});

app.use("/", router);

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
