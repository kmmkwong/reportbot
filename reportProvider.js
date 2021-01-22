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
  
  runReport: function(slackUserId, reportId) {
    const host = process.env.SLACKFORCE_URL;
    const port = `443`;
    const path = `/runReport`;
    const body = {
      user_id: slackUserId,
      report_id: reportId
    };
    return requestUtil.post(host, port, path, body);
  },
  
  updateReport: function(slackUserId, reportId, reportUpdate) {
    const host = process.env.SLACKFORCE_URL;
    const port = `443`;
    const path = `/updatereport`;
    const body = {
      user_id: slackUserId,
      report_name: "foo",
      report_id: reportId,
      report_update: reportUpdate
    };
    return requestUtil.post(host, port, path, body);
  },
  
  describeReport: function(slackUserId, reportId) {
    const host = process.env.SLACKFORCE_URL;
    const port = `443`;
    const path = `/describeReport`;
    const body = {
      user_id: slackUserId,
      report_name: "foo",
      report_id: reportId
    };
    return requestUtil.post(host, port, path, body);
  }
});
