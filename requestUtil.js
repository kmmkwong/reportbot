const http = require("https");

module.exports = {
  get: url => {
    return new Promise(function(resolve, reject) {
      http
        .get(url, resp => {
          try {
            let data = "";

            // A chunk of data has been recieved.
            resp.on("data", chunk => {
              data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on("end", () => {
              try {
                resolve(JSON.parse(data));
              } catch (err) {
                console.log(data);
                reject(err);
              }
            });
          } catch (err) {
            reject(err);
          }
        })
        .on("error", err => {
          reject(err);
        });
    });
  },

  post: (host, port, path, body) => {
    // TODO - does not catch error from status code
    return new Promise(function(resolve, reject) {
      const data = JSON.stringify(body);
      const options = {
        host,
        port,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data.length,
          "User-Agent": "sfreportbot/0.0.1"
        }
      };
      const request = http.request(options, resp => {
        try {
          let data = "";

          // A chunk of data has been recieved.
          resp.on("data", chunk => {
            data += chunk;
          });

          // The whole response has been received. Print out the result.
          resp.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              console.log(data);
              reject(err);
            }
          });
        } catch (err) {
          reject(err);
        }
      });
      request.write(data);
      request.end();
    });
  }
};
