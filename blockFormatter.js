const pinManager = require("./pinManager");

module.exports = {
  getBlocksForReportAggregates: (result, userId) => {
    const reportResults = result.result;
    const reportUrl = result.url;
  
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
        
        // Adds filter info to the report run results
        // const filtersArr = [];
        // const filters = reportResults.reportMetadata.reportFilters;
        // for (const filter of filters) {
        //   const label = {label: reportResults.reportExtendedMetadata.detailColumnInfo[filter.column].label };
        //   filtersArr.push({...filter, ...label});
        // }
        // const filterFields = module.exports.buildCurrentFiltersSection(filtersArr);
        
        const isPinned = pinManager.isPinned(userId, reportResults.attributes.reportId);

        let blocks = [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": ":report: " + `*<${reportUrl}|*${reportResults.attributes.reportName}*>*`
          },
          "accessory": {
            "type": "button",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": (isPinned ? ":pinned2:" : ":pin2:")
            },
            value: JSON.stringify({reportId: reportResults.attributes.reportId, isPinned, reportName: reportResults.attributes.reportName}),
            action_id: 'pinReport'
          }
        }, 
        {
          type: "section",
          fields: fields
        }
        // {
        //   "type": "divider"
        // },
        // {
        //   "type": "section",
        //   "text": {
        //     "type": "mrkdwn",
        //     "text": "*Current Filters*"
        //   }
        // }
        ];
        // blocks = blocks.concat(filterFields);
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
    const filtersArr = [];
    // Add the readable label to filters
    for (const filter of reportFilters) {
      const label = {label: reportResults.reportExtendedMetadata.detailColumnInfo[filter.column].label };
      filtersArr.push({...filter, ...label});
    }
    console.log(JSON.stringify(reportResults) + " report Result here");
    console.log(JSON.stringify(reportResults.attributes) + " attributes")
    const filtersObj = {
      reportId: reportResults.attributes.reportId,
      filters: filtersArr
    };
    
    // SORTING
    const reportSorts = reportResults.reportMetadata.sortBy;
    const sortsArr = [];
    for (const sortField of reportSorts) {
      const label = {sortColumnLabel: reportResults.reportExtendedMetadata.detailColumnInfo[sortField.sortColumn].label };
      sortsArr.push({...sortField, ...label});
    }
    const sortsObj = {
      reportId: reportResults.attributes.reportId,
      sortFields: sortsArr
    };
    
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
					"value": JSON.stringify(filtersObj),
					"action_id": "reportFilter"
				},
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Sort",
						"emoji": true
					},
					"value": JSON.stringify(sortsObj),
					"action_id": "reportSort"
				},
        {
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Subscribe",
						"emoji": true
					},
          "value": "subscribe",
					"action_id": "subscribe_button"
				},
        {
					 "type": "button",
					 "text": {
					           "type": "plain_text",
					           "text": "Show subscriptions"
					         },
					           "value": reportResults.attributes.reportName,
					           "action_id": "show_subscriptions_button"
				}
			]
		}];
    return blocks;
  },
  buildCurrentFiltersSection: (filterObj) => {
    const filterValueFields = [];
      // filterValueFields.push({
      //   "type": "mrkdwn",
      //   "text": "*Standard *"
      // },
      // {
      //   "type": "plain_text",
      //   "text": module.exports.getOperator(filter.operator) + " " + filter.value,
      //   "emoji": true
      // });
    for (const filter of filterObj) {
      filterValueFields.push({
        "type": "mrkdwn",
        "text": "*" + filter.label +"*"
      },
      {
        "type": "plain_text",
        "text": module.exports.getOperator(filter.operator) + " " + filter.value,
        "emoji": true
      });
    }
    if (filterObj.length > 0) {
      const filterValuesSection = {
        "type": "section",
        "fields": filterValueFields
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
  buildFiltersHeaderSection: () => {
    return {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Current Filters*"
      }
    };
  },
  buildFilterCreatorSection: (reportTypeMetadataCategories) => {
    const fieldOptions = [];
    const FIELDS_LIMIT = 100;
    let limitTracker = 0;
    for (const section of reportTypeMetadataCategories) {
      for (const field in section.columns) {
        if (limitTracker >= FIELDS_LIMIT) {
          break;
        }
        fieldOptions.push({
          label: section.columns[field].label,
          value: field
        });
        limitTracker++;
      }
    }
    const fieldOptionsBlock = [];
    for (const field of fieldOptions) {
      fieldOptionsBlock.push({
        text: {
          type: "plain_text",
          text: field.label,
          emoji: true
        },
        value: field.value
      })
    }
    return [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Add New Filter*"
        }
      },
      {
        "type": "section",
        "block_id": "fieldSelectFilterBlock",
        "text": {
          "type": "mrkdwn",
          "text": "Field"
        },
        "accessory": {
          "type": "static_select",
          "placeholder": {
            "type": "plain_text",
            "text": "Select Field",
            "emoji": true
          },
          "options": fieldOptionsBlock,
          "action_id": "fieldFilterAction"
        }
      },
      {
        "type": "section",
        "block_id": "operatorSelectFilterBlock",
        "text": {
          "type": "mrkdwn",
          "text": "Operator"
        },
        "accessory": {
          "type": "static_select",
          "placeholder": {
            "type": "plain_text",
            "text": "Select Operator",
            "emoji": true
          },
          "options": [
            {
              "text": {
                "type": "plain_text",
                "text": "equals",
                "emoji": true
              },
              "value": "equals"
            },
            {
              "text": {
                "type": "plain_text",
                "text": "not equal to",
                "emoji": true
              },
              "value": "notEqual"
            },
            {
              "text": {
                "type": "plain_text",
                "text": "greater than",
                "emoji": true
              },
              "value": "greaterThan"
            },
            {
              "text": {
                "type": "plain_text",
                "text": "less than",
                "emoji": true
              },
              "value": "lessThan"
            },
            {
              "text": {
                "type": "plain_text",
                "text": "less or equal",
                "emoji": true
              },
              "value": "lessOrEqual"
            },
            {
              "text": {
                "type": "plain_text",
                "text": "greater or equal",
                "emoji": true
              },
              "value": "greaterOrEqual"
            }
          ],
          "action_id": "operatorFilterAction"
        }
      },
      {
        "type": "input",
        "block_id": "inputFilterBlock",
        "label": {
          "type": "plain_text",
          "text": "Value"
        },
        "element": {
          "type": "plain_text_input",
          "action_id": "inputFilterAction",
        }
      }
    ];
  },
  buildSortsHeaderSection: () => {
    return {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Current Sorting*"
      }
    };
  },
  buildSortCreatorSection: (sortFields, detailColumnInfo) => {
    const fieldOptions = [];
    for (const column in detailColumnInfo) {
      fieldOptions.push({
        label: detailColumnInfo[column].label,
        value: column
      });
    }
    const fieldOptionsBlock = [];
    for (const field of fieldOptions) {
      fieldOptionsBlock.push({
        text: {
          type: "plain_text",
          text: field.label,
          emoji: true
        },
        value: field.value
      })
    }
    
    let firstSortField = sortFields[0];
    if (!firstSortField) {
      firstSortField = {
        sortColumnLabel: " ",
        sortColumn: " ",
        sortOrder: " "
      };
    }
    return [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Toggle Sorting*"
        }
      },
      {
        "type": "section",
        "block_id": "fieldSelectSortBlock",
        "text": {
          "type": "mrkdwn",
          "text": "Field"
        },
        "accessory": {
          "type": "static_select",
          "placeholder": {
            "type": "plain_text",
            "text": "Select Field",
            "emoji": true
          },
          initial_option: {
            text: {
              type: "plain_text",
              text: firstSortField.sortColumnLabel,
              emoji: true
            },
            value: firstSortField.sortColumn
          },
          "options": fieldOptionsBlock,
          "action_id": "fieldSortAction"
        }
      },
      {
        "type": "section",
        "block_id": "sortDirectionBlock",
        "text": {
          "type": "mrkdwn",
          "text": "Sort Direction"
        },
        "accessory": {
          "type": "static_select",
          "placeholder": {
            "type": "plain_text",
            "text": "Select Sort Direction",
            "emoji": true
          },
          initial_option: {
            text: {
              type: "plain_text",
              text: firstSortField.sortOrder === "Asc" ? "Ascending" : "Descending",
              emoji: true
            },
            value: firstSortField.sortOrder
          },
          "options": [
            {
              "text": {
                "type": "plain_text",
                "text": "Ascending",
                "emoji": true
              },
              "value": "Asc"
            },
            {
              "text": {
                "type": "plain_text",
                "text": "Descending",
                "emoji": true
              },
              "value": "Desc"
            }
          ],
          "action_id": "sortDirectionAction"
        }
      }
    ];
  },
  getOperator: (operator) => {
    switch (operator) {
      case "equals":
        return "=";
      case "notEqual":
        return "!=";
      case "lessThan":
        return "<";
      case "greaterThan":
        return ">";
      case "lessOrEqual":
        return "<=";
      case "greaterOrEqual":
        return ">=";
      default:
        return "=";
    }
  }
};
