const rp = require('request-promise');
const promise = require('bluebird');
const urlLib = require('url');
const config = require('../config/config');

const tpProcessor = require('../processors/third-party');

module.exports = (spotifyObj, spotifyOpts) => {
  let refresherOpts, nextItem, authParam, dataObj,
    updateObj, error;
  authParam = new Buffer(`${config.external.spotify.clientId}:${config.external.spotify.clientSecret}`).toString('base64');
  refresherOpts = {
    method: 'POST',
    uri: 'https://accounts.spotify.com/api/token',
    headers: {
      Authorization: `Basic ${authParam}`
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: spotifyObj.refreshToken
    }
  };

  return promise.mapSeries(spotifyOpts, (val) => rp(val))
    .catch(err => {
      error = err.error;
      console.log('error requesting====', error)
      if (error.error.message === 'The access token expired') {
        spotifyOpts.unshift(refresherOpts);
        return null;
      }
      throw new Error(error.error.message);
    })
    .then((res) => {
      if (res) return res;
      return promise.mapSeries(spotifyOpts, (value, i) => {
        return rp(value)
          .then((data) => {
            if (i === 0) {
              try {
                dataObj = JSON.parse(data);
              } catch(e) {
                dataObj = data;
              } 
              do {
                spotifyOpts[++i].headers.Authorization = `Bearer ${dataObj.access_token}`;
              } while(i < spotifyOpts.length - 1);
              //nextItem = refresherOpts[++i];
              //nextItem.headers.Authorization = `Bearer ${data.access_token}`;
              updateObj = {
                accessToken: dataObj.access_token,
                refreshToken: dataObj.refresh_token
              };

              return tpProcessor.updateThirdParty(spotifyObj._id, updateObj)
                .then(() => null);
            }

            return data;
          });
      })
      .then(result => result.filter(item => item))
      .catch(err => {
        throw new Error(err.message);
      });
    });
};