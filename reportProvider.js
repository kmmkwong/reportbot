const requestUtil = require("./requestUtil");

var exports = (module.exports = {
  findReports: function(slackUserId, searchString, max) {
    const host = process.env.SLACKFORCE_URL;
    const port = `443`;
    const path = `/findReports`;
    const body = {
      user_id: slackUserId,
      search_text: searchString,
      max: max
    };
    return requestUtil.post(host, port, path, body);
  }, 
  
  runReports: function(slackUserId, reportId) {
    const host = process.env.SLACKFORCE_URL;
    const port = `443`;
    const path = `/runReport`;
    const body = {
      user_id: slackUserId,
      report_id: reportId
    };
    return requestUtil.post(host, port, path, body);
  }
});
