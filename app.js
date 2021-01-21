// Require the Bolt package (github.com/slackapi/bolt)
const { App } = require("@slack/bolt");
const puppeteer = require("puppeteer");
const fs = require("fs");
const table = require("./createtable");
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

app.event("message", async ({ event, message, client }) => {
  // console.log('msg', message);
  // console.log('event', event);
  // console.log('client', client);

  try {
    const msgArr = message.text.split(" ");
    if (msgArr[0] + " " + msgArr[1] === "show report") {
      browser = await puppeteer.launch({
        args: ['--no-sandbox']
      });
      const page = await browser.newPage();
      const reportResults = await reportProvider.runReports(event.user, msgArr[2]);
      // 00O4x0000038XOWEA2
      // console.log('rpt', reportResults);
      if (reportResults.error) {
        await client.chat.postMessage({
          channel: message.channel,
          text: reportResults.error
        })
      }
      let rows = '';
      let headerCells = '';
      for (const col in reportResults.result.reportExtendedMetadata.detailColumnInfo) {
        headerCells += table.createHeader(reportResults.result.reportExtendedMetadata.detailColumnInfo[col]);
      }
      rows += table.createRow(headerCells);
      for (const row of reportResults.result.factMap['T!T'].rows) {
        let cells = '';
        for (const cell of row.dataCells) {
          cells += table.createCell(cell);
        }
        rows += table.createRow(cells);
      }
      const htmlTable = table.createTable(rows);
	    const html = table.createHtml(htmlTable);
      await page.setContent(html, {
        waitUntil: 'domcontentloaded'
      });
      // await page.goto('https://developers.google.com/web/tools/puppeteer/');
      const img = await page.screenshot({path: reportResults.reportName + '.png', fullPage: true});
      await browser.close();
      const file = fs.createReadStream(reportResults.reportName + '.png');
      // console.log('File Created', file);
      const result = await client.files.upload({
        channels: message.channel,
        initial_comment: 'Viewing Report - ' + reportResults.reportName,
        file: file
      });
      // const result = await client.chat.postMessage({
      //   channel: message.channel,
      //   "blocks": [
      //     {
      //       "type": "section",
      //       "text": {
      //         "type": "mrkdwn",
      //         "text": "``` -------------- -------------- ------------- ------------- ------------- \n| Account Name | Account ID   | Owner       | Type        | Phone \n ============== ============== ============= ============= ============= \n| body row 1   | column 2     | column 3    | column 4    | column 5   \n| body row 2   | column 2     | column 3    | column 4    | column 5   \n| body row 3   | column 2     | column 3    | column 4    | column 5   \n| body row 4   | column 2     | column 3    | column 4    | column 5   \n| body row 5   | column 2     | column 3    | column 4    | column 5   \n| body row 6   | column 2     | column 3    | column 4    | column 5   \n| body row 7   | column 2     | column 3    | column 4    | column 5   \n| body row 8   | column 2     | column 3    | column 4    | column 5   \n| body row 9   | column 2     | column 3    | column 4    | column 5   \n| body row 10  | column 2     | column 3    | column 4    | column 5   \n -------------- -------------- ------------- ------------- ------------- ```"
      //       }
      //     }
      //   ]
      // });
    } else {
      // const result = await client.chat.postMessage({
      //   channel: message.channel,
      //   text: 'Say "show report" to run report'
      // });
    }

  } catch (error) {
    console.error(error);
  }
});

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
  const textArray = event.text.split(" ");
  let command = "";
  if (textArray.length > 1) {
    command = textArray[1];
  }
  switch (command) {
    case "find":
      const searchText = textArray.length > 2 ? textArray[2] : ""
      reportProvider.findReports(event.user, searchText, 5).then((res) => {
        console.log(res);      
        const blocks = blockFormatter.getBlocksForReportList(event.user, res);
        // try {
          app.client.chat.postMessage({
            token: context.botToken,
            // Channel to send message to
            channel: "general",
            // Include a button in the message (or whatever blocks you want!)
            blocks,
            // Text in the notification
            text: "Message from Report Bot"
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
      const reportId = textArray.length > 2 ? textArray[2] : ""
      reportProvider.runReports(event.user, reportId).then((res) => {
        console.log(res);      
      }).catch((err) => {
        console.log(err);              
      });
      break;
    case "testbutton":
      //console.log(event);
      const helloMessage = "Hello <@" + event.user + ">! Testing button. Click it.";
      try {
        const result = await app.client.chat.postMessage({
          token: context.botToken,
          // Channel to send message to
          channel: "general",
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
					                  "action_id": "button_1"
				                  },
				                  {
					                 "type": "button",
					                 "text": {
					                        	"type": "plain_text",
					                        	"text": "Sort"
					                          },
					                  "value": "sort",
					                  "action_id": "button_2"
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
          channel: "general",
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
        console.log(result);
      } catch (error) {
        console.error(error);
      }
    }
  }
});
