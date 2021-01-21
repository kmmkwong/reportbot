module.exports = {
  getBlocksForReportList: (user, findReportResult) => {
    let blocks = [];
    
    if (findReportResult.error) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: findReportResult.error
        }
      });
      return blocks;
    }

    if (findReportResult.reports && findReportResult.reports.length > 0) {
      const message =
        "<@" +
        user +
        "> I found some reports for you.  Which one would you like to view?";
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: message
        }
      });

      const reports = findReportResult.reports;
      reports.forEach(report => {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*<${report.url}|*${report.name}*>*`
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              emoji: true,
              text: "View Report"
            },
            value: "click_me_123"
          }
        });
      });
    } else {
      let message =
        "<@" +
        user +
        "> I cannot find any report for you.";
      if (findReportResult.search_text) {
        message = message + `  Are you sure *${findReportResult.search_text}* is the right report name?`;
      }
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: message
        }
      });
    }
    return blocks;
  }
};
