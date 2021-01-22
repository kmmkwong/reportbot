// Require the Bolt package (github.com/slackapi/bolt)
const { App } = require("@slack/bolt");
const puppeteer = require("puppeteer");
const fs = require("fs");
const tableUtil = require("./htmlTableUtil");
const reportProvider = require("./reportProvider");
const blockFormatter = require("./blockFormatter");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

let browser;

// All the room in the world for your code

(async () => {

  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();

app.action('reportFilter', async ({action, client, ack, respond, body }) => {
  await ack();
  console.log('reportfilterbody', body);
  const filterObj = JSON.parse(body.actions[0].value)[0];
  
  if (filterObj) {
    
  }
  try {
    /* view.publish is the method that your app uses to push a view to the Home tab */
    const result = await client.views.open({
      /* the view object that appears in the app home*/
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
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Current Filters*"
            }
          },
          ...blockFormatter.getBlocksForFilter(filterObj),
          // {
          //   "type": "actions",
          //   "elements": [
          //     {
          //       "type": "button",
          //       "text": {
          //         "type": "plain_text",
          //         "text": "Filter",
          //         "emoji": true
          //       },
          //       "value": "to add",
          //       "action_id": "reportFilter"
          //     },
          //     {
          //       "type": "button",
          //       "text": {
          //         "type": "plain_text",
          //         "text": "Sort",
          //         "emoji": true
          //       },
          //       "value": "to add",
          //       "action_id": "reportSort"
          //     }
          //   ]
          // },
          {
            "type": "divider"
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Add New Filter*"
            }
          },
          {
            "type": "section",
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
              "options": [
                {
                  "text": {
                    "type": "plain_text",
                    "text": "FieldA",
                    "emoji": true
                  },
                  "value": "value-0"
                }
              ],
              "action_id": "fieldFilterAction"
            }
          },
                    {
            "type": "section",
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
                  "value": "operator-equals"
                },
                {
                  "text": {
                    "type": "plain_text",
                    "text": "greater than",
                    "emoji": true
                  },
                  "value": "operator-gt"
                },
                {
                  "text": {
                    "type": "plain_text",
                    "text": "less than",
                    "emoji": true
                  },
                  "value": "operator-lt"
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
        ]
      }

    });
  } catch (error) {
    console.error(error);
  }
});

app.action('reportSearch', async ({ action, client, ack, respond, body }) => {
  await ack();
  browser = await puppeteer.launch({
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  const valueObj = JSON.parse(action.value);
  const reportResults = await reportProvider.runReport(body.user.id, valueObj.reportId);
  if (reportResults.error) {
    await client.chat.postMessage({
      channel: body.channel.id,
      text: reportResults.error
    })
  }
  const html = tableUtil.createFormattedReport(reportResults.result);
  await page.setContent(html, {
    waitUntil: 'domcontentloaded'
  });
  const img = await page.screenshot({path: 'imgs/' + reportResults.reportName + '.png', fullPage: true});
  await browser.close();
  const file = fs.createReadStream('imgs/' + reportResults.reportName + '.png');
  const aggregateBlocks = blockFormatter.getBlocksForReportAggregates(reportResults.result, valueObj.reportUrl);
  
  const clientMessage = await client.chat.postMessage({
    channel: body.channel.id,
    blocks: aggregateBlocks
  });
  const result = await client.files.upload({
    channels: body.channel.id,
    file: file
  });
  
  const nextSteps = await client.chat.postMessage({
    channel: body.channel.id,
    blocks: blockFormatter.getBlocksForReportAction(reportResults.result),
  });
  await respond('Viewing Report - ' + reportResults.reportName);
});

app.view('subscribe_view', async ({action, client, ack, respond, body }) => {
  await ack(); 
 try {
      const ScheduleInfo = {
      dateSelected: body.view.state.values.datepicker1["datepicker-action"].selected_date,
      frequency: body.view.state.values.frequency1["static_select-action"].selected_option.text.text,
      time:body.view.state.values.timepicker1["static_select-action"].selected_option.text.text
     }
      const scheduleInfoList = []
      if(Window.localStorage.getItem("scheduleInfoList") === "undefined") {
        scheduleInfoList.push(ScheduleInfo);
        } else {
                 scheduleInfoList = Window.localStorage.getItem("scheduleInfoList");
                 scheduleInfoList.push(ScheduleInfo);
               }
  Window.localStorage.setItem("scheduleInfoList", ScheduleInfo);
 } catch(error) {
    console.log(error);
 }

});

// app.action('show_subscriptions_button', async({action, client, ack, respond, body}) => {
//   await ack();
//   const scheduledDataList = [];
//   scheduledDataList.push(localStorage.getItem("ScheduleInfo"));
//   console.log(scheduledDataList);
// });

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

app.event("app_home_opened", async ({ event, client, context }) => {
  try {
    /* view.publish is the method that your app uses to push a view to the Home tab */
    const result = await client.views.publish({
      /* the user that opened your app's app home */
      user_id: event.user,

      /* the view object that appears in the app home*/
      view: {
        type: "home",
        callback_id: "home_view",

        /* body of the view */
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Welcome to your _App's Home_* :tada:"
            }
          },
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                "This button won't do much for now but you can set up a listener for it using the `actions()` method and passing its unique `action_id`. See an example in the `examples` folder within your Bolt app."
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Click here!"
                }
              }
            ]
          }
        ]
      }
    });
  } catch (error) {
    console.error(error);
  }
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
    case "find":
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
    case "run":
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
				                  {
				                	 "type": "button",
					                 "text": {
						                        "type": "plain_text",
						                        "text": "Subscribe"
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
					                  "value": "sort",
					                  "action_id": "show_subscriptions_button"
				                  }
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
      const helloMessage = "Hello <@" + event.user + ">! Go ahead. Click it.";
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
            },
		        {
			       "type": "actions",
			       "block_id": "actions1",
			       "elements": [
				                  {
				                	 "type": "button",
					                 "text": {
						                        "type": "plain_text",
						                        "text": "Whoops"
					                         },
					                  "value": "whoops",
					                  "action_id": "button_3"
				                  },
			                  ]                  
		      }
        ],
          // Text in the notification
          text: "Message from Test App"
        });
        console.log("----- result ---- ");
        console.log(result + " default");
      } catch (error) {
        console.error(error);
      }
    }
  }
});
