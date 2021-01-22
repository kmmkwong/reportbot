module.exports = {
  getBlocksForReportAggregates: (reportResults, reportUrl) => {
    const reportFormat = reportResults.reportMetadata.reportFormat;
    
    switch (reportFormat) {
      case "TABULAR":
        const aggregateColumnNames = reportResults.reportExtendedMetadata.aggregateColumnInfo;
        const aggregateColumnIds = reportResults.reportMetadata.aggregates;
        const aggregateData = reportResults.factMap['T!T'].aggregates;
        const fields = [];
        for (let i = 0; i < aggregateData.length; i++) {
          fields.push({
            type: "mrkdwn",
            text: "*" + aggregateColumnNames[aggregateColumnIds[i]].label + "*"
          }, 
          {
            type: "plain_text",
            text: aggregateData[i].label
          }
         )
        }
        const blocks = [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `*<${reportUrl}|*${reportResults.attributes.reportName}*>*`
          },
          "accessory": {
            "type": "button",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": "Pin to Home"
            },
            "value": "click_me_123"
          }
        }, 
        {
          type: "section",
          fields: fields
        }];
        // console.log('blocks', JSON.stringify(blocks));
        return blocks;
      default:
        return [];
    }
  },
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
            value: JSON.stringify({reportId: report.id, reportUrl: report.url}),
            action_id: 'reportSearch'
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
  },
  getBlocksForReportAction: (reportResults) => {
    const stringifiedResults = JSON.stringify(JSON.stringify(reportResults));
    const reportFilters = reportResults.reportMetadata.reportFilters;
    const filterObj = [];
    // Add the readable label to filters
    for (const filter of reportFilters) {
      const label = {label: reportResults.reportExtendedMetadata.detailColumnInfo[filter.column].label };
      filterObj.push({...filter, ...label});
    }
    console.log('filters', JSON.stringify(filterObj));
    const blocks = [{
			"type": "actions",
			"elements": [
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Filter",
						"emoji": true
					},
					"value": JSON.stringify(filterObj),
					"action_id": "reportFilter"
				},
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Sort",
						"emoji": true
					},
					"value": "stringifiedResults",
					"action_id": "reportSort"
				}
			]
		}];
    return blocks;
  },
  getBlocksForFilter: (filterObj) => {
    if (filterObj) {
      const filterValuesSection = {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": "*" + filterObj.label +"*"
          },
          {
            "type": "plain_text",
            "text": this.getOperator(filterObj.operator) + " " + filterObj.value,
            "emoji": true
          }
        ]
      };
      return filterValuesSection;
    } else {
      const filterValuesSection = {
        "type": "section",
        "fields": [
          {
            type: "mrkdwn",
            text: "_There are no filters for this report._"
          }
        ]
      };
      return filterValuesSection;
    }
  },
  getOperator: (operator) => {
    switch (operator) {
      case "lessThan":
        return "<";
      case "greaterThan":
        return ">";
      default:
        return "=";
    }
  }
};
