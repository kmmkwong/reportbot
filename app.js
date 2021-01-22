// Require the Bolt package (github.com/slackapi/bolt)
const { App } = require("@slack/bolt");
const puppeteer = require("puppeteer");
const fs = require("fs");
const tableUtil = require("./htmlTableUtil");
const reportProvider = require("./reportProvider");
const blockFormatter = require("./blockFormatter");
const pinManager = require("./pinManager");

var scheduleInfoList = [];
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

let browser;

// All the room in the world for your code

(async () => {

  // Start your app
  await app.start(process.env.PORT || 3000);
  
  pinManager.loadPins();

  console.log("⚡️ Bolt app is running!");
})();

app.action('reportFilter', async ({action, client, ack, respond, body }) => {
  await ack();
  const filterObj = JSON.parse(body.actions[0].value);
  const reportMetadata = await reportProvider.describeReport(body.user.id, filterObj.reportId);
  const reportTypeMetadataCategories = reportMetadata.result.reportTypeMetadata.categories;
  try {
    let filterModalContents = [];
    const headerSection = blockFormatter.buildFiltersHeaderSection();
    const currentFiltersSection = blockFormatter.buildCurrentFiltersSection(filterObj.filters);
    const filterCreatorSection = blockFormatter.buildFilterCreatorSection(reportTypeMetadataCategories);
    const divider = [
      {
        "type": "divider"
      }
    ];
    const filterChangeRemoveActions = [
      {
        type: "actions",
        "elements": [
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "Edit a Filter",
              "emoji": true
            },
            "value": "change",
            "action_id": "editFilter"
          },
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "Remove a Filter",
              "emoji": true
            },
            "value": "remove",
            "action_id": "removeFilter"
          }
        ]
      }
    ];
    filterModalContents = filterModalContents.concat(headerSection, currentFiltersSection, filterChangeRemoveActions, divider, filterCreatorSection);
    const extraData = {
      channelId: body.channel.id,
      reportId: filterObj.reportId
    };
    const result = await client.views.open({
      trigger_id: body.trigger_id,
      
      view: {
        type: "modal",
        callback_id: 'reportFilterView',
        title: {
          type: "plain_text",
          text: "Filter Report"
        },
        submit: {
          type: "plain_text",
          text: "Filter",
        },
        "blocks": filterModalContents,
        "private_metadata": JSON.stringify(extraData)
      }

    });
  } catch (error) {
    console.error(error);
  }
});

// async runReport()

app.view('reportFilterView', async ({client, ack, respond, body, view }) => {
  await ack(); 
   try {
     const extraMetadata = JSON.parse(body.view.private_metadata);
     const reportId = extraMetadata.reportId;
     const submittedValues = body.view.state.values;
     const fieldValue = submittedValues.fieldSelectFilterBlock.fieldFilterAction.selected_option.value;
     const operatorValue = submittedValues.operatorSelectFilterBlock.operatorFilterAction.selected_option.value;
     const inputValue = submittedValues.inputFilterBlock.inputFilterAction.value;
     console.log('filter sumbitted', fieldValue, operatorValue, inputValue);
     const reportFilters = [
      {
        value: inputValue,
        operator: operatorValue,
        column: fieldValue
      }
     ];
     const reportUpdate = {
       reportFilters: reportFilters
     };
     if (reportUpdate) {
        // update an run report 
        reportProvider.updateReport(body.user.id, reportId, reportUpdate).then((res) => {
            body.reportId = reportId;
            body.reportUrl = '';
            body.channelId = extraMetadata.channelId;
            publishReport({}, body, client, false);
        }).catch((err) => {
            console.log("--- Error updating report --- ", err);      
        });
      } else {
        // run a report 
        const reportResult = await reportProvider.runReport(body.user.id, reportId);
      }
   } catch(error) {
      console.log(error);
   }
});

app.action('fieldFilterAction', async ({ ack, say }) => {
  await ack();
});

app.action('operatorFilterAction', async ({ ack, say }) => {
  await ack();
});


app.action('reportSort', async ({action, client, ack, respond, body }) => {
  await ack();
  const sortsObj = JSON.parse(body.actions[0].value);
  const reportMetadata = await reportProvider.describeReport(body.user.id, sortsObj.reportId);
  const detailColumnInfo = reportMetadata.result.reportExtendedMetadata.detailColumnInfo;
  try {
    let sortModalContents = [];
    // const headerSection = blockFormatter.buildSortsHeaderSection();
    // const currentFiltersSection = blockFormatter.buildCurrentFiltersSection(sortsObj.filters);
    const sortCreatorSection = blockFormatter.buildSortCreatorSection(sortsObj.sortFields, detailColumnInfo);
    // const divider = [
    //   {
    //     "type": "divider"
    //   }
    // ];
    sortModalContents = sortModalContents.concat(sortCreatorSection);
    const extraData = {
      channelId: body.channel.id,
      reportId: sortsObj.reportId
    };
    const result = await client.views.open({
      trigger_id: body.trigger_id,
      
      view: {
        type: "modal",
        callback_id: 'reportSortsView',
        title: {
          type: "plain_text",
          text: "Sort Report"
        },
        submit: {
          type: "plain_text",
          text: "Sort",
        },
        "blocks": sortModalContents,
        "private_metadata": JSON.stringify(extraData)
      }

    });
  } catch (error) {
    console.error(error);
  }
});

app.view('reportSortsView', async ({client, ack, respond, body, view }) => {
  await ack(); 
   try {
     const extraMetadata = JSON.parse(body.view.private_metadata);
     const reportId = extraMetadata.reportId;
     const submittedValues = body.view.state.values;
     const sortColumnValue = submittedValues.fieldSelectSortBlock.fieldSortAction.selected_option.value;
     const sortOrderValue = submittedValues.sortDirectionBlock.sortDirectionAction.selected_option.value;
     const reportSort = [
      {
        sortColumn: sortColumnValue,
        sortOrder: sortOrderValue
      }
     ];
     const reportUpdate = {
       sortBy: reportSort
     };
     if (reportUpdate) {
        // update an run report 
        reportProvider.updateReport(body.user.id, reportId, reportUpdate).then((res) => {
            body.reportId = reportId;
            body.reportUrl = '';
            body.channelId = extraMetadata.channelId;
            publishReport({}, body, client, false);
        }).catch((err) => {
            console.log("--- Error updating report --- ", err);      
        });
      } else {
        // run a report 
        const reportResult = await reportProvider.runReport(body.user.id, reportId);
      }
   } catch(error) {
      console.log(error);
   }
});

app.action('fieldSortAction', async ({ ack, say }) => {
  await ack();
});

app.action('sortDirectionAction', async ({ ack, say }) => {
  await ack();
});

let publishHome = async (client, userId) => {
  try {
    
    // call to run all reports that have been pinned. 
    const pinReportIds = pinManager.getPinned(userId);
    const runPromises = pinReportIds.map((reportId) => reportProvider.runReport(userId, reportId));
    const allResults = await Promise.all(runPromises.map(p => p.catch(e => e)));
    const reportResults = allResults.filter(result => !(result instanceof Error)); // filter and ignore errors
    
    console.log("app_home_open report run results: " + reportResults.length);
    console.log(reportResults);

    let blocks = [];
    reportResults.forEach((result) => {
      const aggregateBlocks = blockFormatter.getBlocksForReportAggregates(result, userId);
      blocks = blocks.concat(aggregateBlocks);
      blocks.push({
        "type": "divider"
      });
    });
    
    
    /* view.publish is the method that your app uses to push a view to the Home tab */
    const result = await client.views.publish({
      /* the user that opened your app's app home */
      user_id: userId,

      /* the view object that appears in the app home*/
      view: {
        type: "home",
        callback_id: "home_view",
        blocks
      }
    });
  } catch (error) {
    console.error(error);
  }
};


let publishReport = async (action, body, client, isInitialReportRun) => { 
  browser = await puppeteer.launch({
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    let reportId;
    let reportUrl;
    if (isInitialReportRun) {
      const valueObj = JSON.parse(action.value);
      reportId = valueObj.reportId;
    } else {
      reportId = body.reportId;
    }

    const reportResults = await reportProvider.runReport(body.user.id, reportId);
    if (reportResults.error) {
      await client.chat.postMessage({
        channel: body.channelId || body.channel.id,
        text: reportResults.error
      })
    }
    console.log('got report results', reportResults);
    if (reportResults.result.factMap['T!T'].rows.length !== 0) {
      const html = tableUtil.createFormattedReport(reportResults.result);
      await page.setContent(html, {
        waitUntil: 'domcontentloaded'
      });
      const img = await page.screenshot({path: 'imgs/' + reportResults.reportName + '.png', fullPage: true});
      await browser.close();
      const file = fs.createReadStream('imgs/' + reportResults.reportName + '.png');
      const aggregateBlocks = blockFormatter.getBlocksForReportAggregates(reportResults, body.user.id);

      const clientMessage = await client.chat.postMessage({
        channel: body.channelId || body.channel.id,
        blocks: aggregateBlocks
      });
      const result = await client.files.upload({
        channels: body.channelId || body.channel.id,
        file: file
      });
    } else {
      const clientMessage = await client.chat.postMessage({
        channel: body.channelId || body.channel.id,
        blocks: [
          {
            "type": "section",
            "fields": [
              {
                type: "mrkdwn",
                text: "_There are no rows for the report - *" + reportResults.result.attributes.reportName + "*._"
              }
            ]
          }
        ]
      });
    }


    const nextSteps = await client.chat.postMessage({
      channel: body.channelId || body.channel.id,
      blocks: blockFormatter.getBlocksForReportAction(reportResults.result),
    });
};

app.action('reportSearch', async ({ action, client, ack, respond, body }) => {
  await ack();
  publishReport(action, body, client, true);
//   browser = await puppeteer.launch({
//     args: ['--no-sandbox']
//   });
//   const page = await browser.newPage();
//   const valueObj = JSON.parse(action.value);
//   const reportResults = await reportProvider.runReport(body.user.id, valueObj.reportId);
//   if (reportResults.error) {
//     await client.chat.postMessage({
//       channel: body.channel.id,
//       text: reportResults.error
//     })
//   }
//   const html = tableUtil.createFormattedReport(reportResults.result);
//   await page.setContent(html, {
//     waitUntil: 'domcontentloaded'
//   });
//   const img = await page.screenshot({path: 'imgs/' + reportResults.reportName + '.png', fullPage: true});
//   await browser.close();
//   const file = fs.createReadStream('imgs/' + reportResults.reportName + '.png');
//   const aggregateBlocks = blockFormatter.getBlocksForReportAggregates(reportResults.result, valueObj.reportUrl, body.user.id);
  
//   const clientMessage = await client.chat.postMessage({
//     channel: body.channel.id,
//     blocks: aggregateBlocks
//   });
//   const result = await client.files.upload({
//     channels: body.channel.id,
//     file: file
//   });
  
//   const nextSteps = await client.chat.postMessage({
//     channel: body.channel.id,
//     blocks: blockFormatter.getBlocksForReportAction(reportResults.result),
//   });
  await respond("Here is your report  <@" + body.user.id + ">!");
});

app.action('pinReport', async ({ action, client, ack, respond, body }) => {
  await ack();
  // console.log("--- pinReport client ---");
  // console.log(client);
  // console.log("--- pinReport action ---");
  // console.log(action);
  // console.log("--- pinReport body ---");
  // console.log(body);
  const valueObj = JSON.parse(action.value);
  const isPinned = pinManager.isPinned(body.user.id, valueObj.reportId);
  const done = isPinned ? "unpinned" : "pinned";
  if (isPinned) {
    pinManager.unpin(body.user.id, valueObj.reportId);
  } else {
    pinManager.pin(body.user.id, valueObj.reportId);    
  }
  if (body.view && body.view.type === "home") {
      publishHome(client, body.user.id);
  } else if (body.channel && body.channel.id) {
    const message = "I have " + done + " this report for your <@" + body.user.id + "> - " + valueObj.reportName;
    // await respond(helloMessage);
    await client.chat.postMessage({
      channel: body.channelId || body.channel.id,
      text: message
    })
  }
});


app.view('subscribe_view', async ({action, client, ack, respond, body }) => {
  await ack(); 
 try {
      const ScheduleInfo = {
      dateSelected: body.view.state.values.datepicker1["datepicker-action"].selected_date,
      frequency: body.view.state.values.frequency1["static_select-action"].selected_option.text.text,
      time:body.view.state.values.timepicker1["static_select-action"].selected_option.text.text
     }
      scheduleInfoList.push(ScheduleInfo);
 } catch(error) {
    console.log(error);
 }

});

app.action('show_subscriptions_button', async({action, client, ack, respond, body}) => {
  console.log('show_subscriptions_button');
    await ack(); 
  try {
     // const reportName = action.value;
     const reportName = body.actions[0].value;
     console.log(reportName + " hello ReportName")
     const listOfElements = [
        {
			"type": "section",
			"text": {
				"type": "plain_text",
				"text": "Subscribed Reports",
				"emoji": true
			}
		}
     ];
     for(let i = 0; i < scheduleInfoList.length; i ++) {
       listOfElements.push(
                 {
                  "type": "section",
                  "text": {
                    "type": "plain_text",
                    "text": "Subscribed to " + reportName + " report" + " scheduled for " + scheduleInfoList[i].dateSelected + " " + scheduleInfoList[i].frequency + " " + scheduleInfoList[i].time,
                    "emoji": true
			            }
		            })
     }
     console.log(listOfElements)
      const result = await client.views.open({
        trigger_id: body.trigger_id,
        
        view: {
	      "title": {
		      "type": "plain_text",
		      "text": "Scheduled date & time"
	      },
	      "blocks":  listOfElements,
	      "type": "modal"
}
      });
  } catch(error) {
    console.log(error)
  }
});

app.action('subscribe_button', async ({action, client, ack, respond, body }) => {
  console.log('ACK');
  await ack();
  //await say('SEARCH');
  // Update the message to reflect the action
try {
    /* view.publish is the method that your app uses to push a view to the Home tab */
    const result = await client.views.open({
      /* the view object that appears in the app home*/
      trigger_id: body.trigger_id,
      
      view: {
        type: "modal",
        callback_id: 'subscribe_view',
        title: {
          type: "plain_text",
          text: "Schedule Date"
        },
        submit: {
          type: "plain_text",
          text: "Submit",
        },
        "blocks": [
				            {
			                "type": "input",
                      block_id:"datepicker1",
			                "element": {
				                  "type": "datepicker",
			                  	"initial_date": "2021-01-21",
			                  	"placeholder": {
				                    	"type": "plain_text",
				                    	"text": "Select a date",
				                    	"emoji": true
			                  	},
			                  	"action_id": "datepicker-action"
		                  	},
		                	"label": {
		                  		"type": "plain_text",
			                  	"text": "Date",
			                  	"emoji": true
			                }
	                	},
                    {
                      "type": "input",
                      block_id:"frequency1",
                      "element": {
                        "type": "static_select",
                        "placeholder": {
                          "type": "plain_text",
                          "text": "Select an item",
                          "emoji": true
                        },
                        "options": [
                          {
                            "text": {
                              "type": "plain_text",
                              "text": "Daily",
                              "emoji": true
                            },
                            "value": "value-0"
                          },
                          {
                            "text": {
                              "type": "plain_text",
                              "text": "Weekly",
                              "emoji": true
                            },
                            "value": "value-1"
                          },
                          {
                            "text": {
                              "type": "plain_text",
                              "text": "Monthly",
                              "emoji": true
                            },
                            "value": "value-2"
                          }
                        ],
                        "action_id": "static_select-action"
                      },
                      "label": {
                        "type": "plain_text",
                        "text": "Frequency",
                        "emoji": true
                      }
		                },
                    {        
                      "type": "input",
                      block_id:"timepicker1",
                      "element": {
                        "type": "static_select",
                        "placeholder": {
                          "type": "plain_text",
                          "text": "Select an time",
                          "emoji": true
                        },
                        "options": [
                          {
                            "text": {
                              "type": "plain_text",
                              "text": "12:00 AM",
                              "emoji": true
                            },
                            "value": "value-0"
                          },
                          {
                            "text": {
                              "type": "plain_text",
                              "text": "1:00 AM",
                              "emoji": true
                            },
                            "value": "value-1"
                          },
                          {
                            "text": {
                              "type": "plain_text",
                              "text": "2:00 AM",
                              "emoji": true
                            },
                            "value": "value-2"
                          },
                          {
                            "text": {
                              "type": "plain_text",
                              "text": "13:00 PM",
                              "emoji": true
                            },
                            "value": "value-3"
                          },
                          {
                            "text": {
                              "type": "plain_text",
                              "text": "14:00 PM",
                              "emoji": true
                            },
                            "value": "value-4"
                          },
                          {
                            "text": {
                              "type": "plain_text",
                              "text": "15:00 PM",
                              "emoji": true
                            },
                            "value": "value-5"
                          },
                          {
                            "text": {
                              "type": "plain_text",
                              "text": "15:30 PM",
                              "emoji": true
                            },
                            "value": "value-6"
                          }
                        ],
                        "action_id": "static_select-action"
                      },
                      "label": {
                        "type": "plain_text",
                        "text": "Time",
                        "emoji": true
                      }
		                }
	                ]
      }

    });
  } catch (error) {
    console.error(error);
  }
});

app.event("app_home_opened", async ({ event, client, context }) => {
    publishHome(client, event.user);
//   try {
    
//     // call to run all reports that have been pinned. 
//     const pinReportIds = pinManager.getPinned(event.user);
//     const runPromises = pinReportIds.map((reportId) => reportProvider.runReport(event.user, reportId));
//     const allResults = await Promise.all(runPromises.map(p => p.catch(e => e)));
//     const reportResults = allResults.filter(result => !(result instanceof Error)); // filter and ignore errors
    
//     console.log("app_home_open report run results: " + reportResults.length);
//     console.log(reportResults);

//     let blocks = [];
//     reportResults.forEach((result) => {
//       const aggregateBlocks = blockFormatter.getBlocksForReportAggregates(result, event.user);
//       blocks = blocks.concat(aggregateBlocks);
//       blocks.push({
//         "type": "divider"
//       });
//     });
    
    
//     /* view.publish is the method that your app uses to push a view to the Home tab */
//     const result = await client.views.publish({
//       /* the user that opened your app's app home */
//       user_id: event.user,

//       /* the view object that appears in the app home*/
//       view: {
//         type: "home",
//         callback_id: "home_view",
//         blocks
//       }
//     });
//   } catch (error) {
//     console.error(error);
//   }
});

app.event("app_mention", async ({ event, client, context }) => {
  // console.log("----- event ---- ");
  const textArray = event.text.split(/\s+/);
  let command = "";
  if (textArray.length > 1) {
    command = textArray[1];
  }
  console.log(event.text);
  console.log(textArray[1]);
  
  switch (command) {
    case "run":
      const searchText = textArray.length > 2 ? textArray[2] : "";
      reportProvider.findReports(event.user, searchText, 5).then((res) => {
        console.log(res);      
        const blocks = blockFormatter.getBlocksForReportList(event.user, res);
        // try {
          app.client.chat.postMessage({
            token: context.botToken,
            // Channel to send message to
            // TODO - not working
            channel: event.channel,
            // Include a button in the message (or whatever blocks you want!)
            blocks,
            // Text in the notification
            text: "View Report Results"
          }).then(result => {
            console.log(result);            
          }).catch(error => {
            console.error(error);
          });
          // console.log("----- result ---- ");
          // console.log(result);
        // } catch (error) {
        //   console.error(error);
        // }
      }).catch((err) => {
        console.log(err);              
      });
      break;
    case "runReportTest":
      const reportId = textArray.length > 2 ? textArray[2] : "";
      // const reportUpdate = textArray.length > 3 ? textArray[3] : "";
      const reportUpdate = {
        "reportFilters": [
            {
                "column": "STAGE_NAME",
                "isRunPageEditable": true,
                "operator": "equals",
                "value": "Closed Won"
            },
            {
                "column": "AMOUNT",
                "isRunPageEditable": true,
                "operator": "greaterOrEqual",
                "value": 200000
            }
        ],
        "sortBy": [
            {
                "sortColumn": "AMOUNT",
                "sortOrder": "Desc"
            }
        ]};
      if (reportUpdate) {
        // update an run report 
        reportProvider.updateReport(event.user, reportId, reportUpdate).then((res) => {
          console.log("--- Done updating report --- ");      
          reportProvider.runReport(event.user, reportId).then((res2) => {
            console.log("--- Done running report --- ");      
            console.log("   Number of rows: " + res2.result.factMap['T!T'].rows.length);      
          }).catch((err2) => {
            console.log("--- Error running report --- ");      
          });
        }).catch((err) => {
            console.log("--- Error updating report --- ");      
        });
      } else {
        // run a report 
        reportProvider.runReport(event.user, reportId).then((res) => {
          console.log(res);      
        }).catch((err) => {
          console.log(err);              
        });
      }
      break;
    case "testbutton":
      //console.log(event);
      const helloMessage = "Hello <@" + event.user + ">! Testing button. Click it.";
      try {
        const result = await app.client.chat.postMessage({
          token: context.botToken,
          // Channel to send message to
          channel: event.channel,
          // Include a button in the message (or whatever blocks you want!)
         "blocks": [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: helloMessage
              }
            },
		        {
			       "type": "actions",
			       "block_id": "actions1",
			       "elements": [				                  
			                   ]                  
		      }
	      ],
          // Text in the notification
          text: "Message from Test App"
        });
        console.log("----- result ---- ");
        console.log(result);
      } catch (error) {
        console.error(error);
      }
      break;
    default: {
//      console.log(event);
      const helloMessage = "Hello <@" + event.user + ">!  Tell me which report you would like to run.  Try 'run [report name]'";
      try {
        const result = await app.client.chat.postMessage({
          token: context.botToken,
          // Channel to send message to
          channel: event.channel,
          // Include a button in the message (or whatever blocks you want!)
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: helloMessage
              }
            }
        ],
          // Text in the notification
          text: "Message from Reports Bot"
        });
        console.log("----- result ---- ");
        console.log(result + " default");
      } catch (error) {
        console.error(error);
      }
    }
  }
});


// Initial Report Image display code
// app.event("message", async ({ event, message, client }) => {
//   // console.log('msg', message);
//   // console.log('event', event);
//   // console.log('client', client);

//   try {
//     const msgArr = message.text.split(" ");
//     if (msgArr[0] + " " + msgArr[1] === "show report") {
//       browser = await puppeteer.launch({
//         args: ['--no-sandbox']
//       });
//       const page = await browser.newPage();
//       const reportResults = await reportProvider.runReport(event.user, msgArr[2]);
//       // 00O4x0000038XOWEA2
//       // console.log('rpt', reportResults);
//       if (reportResults.error) {
//         await client.chat.postMessage({
//           channel: message.channel,
//           text: reportResults.error
//         })
//       }
//       const html = tableUtil.createFormattedReport(reportResults.result);
//       await page.setContent(html, {
//         waitUntil: 'domcontentloaded'
//       });
//       // await page.goto('https://developers.google.com/web/tools/puppeteer/');
//       const img = await page.screenshot({path: 'imgs/' + reportResults.reportName + '.png', fullPage: true});
//       await browser.close();
//       const file = fs.createReadStream('imgs/' + reportResults.reportName + '.png');
//       // console.log('File Created', file);
//       const result = await client.files.upload({
//         channels: message.channel,
//         initial_comment: 'Viewing Report - ' + reportResults.reportName,
//         file: file
//       });
//       // const result = await client.chat.postMessage({
//       //   channel: message.channel,
//       //   "blocks": [
//       //     {
//       //       "type": "section",
//       //       "text": {
//       //         "type": "mrkdwn",
//       //         "text": "``` -------------- -------------- ------------- ------------- ------------- \n| Account Name | Account ID   | Owner       | Type        | Phone \n ============== ============== ============= ============= ============= \n| body row 1   | column 2     | column 3    | column 4    | column 5   \n| body row 2   | column 2     | column 3    | column 4    | column 5   \n| body row 3   | column 2     | column 3    | column 4    | column 5   \n| body row 4   | column 2     | column 3    | column 4    | column 5   \n| body row 5   | column 2     | column 3    | column 4    | column 5   \n| body row 6   | column 2     | column 3    | column 4    | column 5   \n| body row 7   | column 2     | column 3    | column 4    | column 5   \n| body row 8   | column 2     | column 3    | column 4    | column 5   \n| body row 9   | column 2     | column 3    | column 4    | column 5   \n| body row 10  | column 2     | column 3    | column 4    | column 5   \n -------------- -------------- ------------- ------------- ------------- ```"
//       //       }
//       //     }
//       //   ]
//       // });
//     } else {
//       // const result = await client.chat.postMessage({
//       //   channel: message.channel,
//       //   text: 'Say "show report" to run report'
//       // });
//     }

//   } catch (error) {
//     console.error(error);
//   }
// });