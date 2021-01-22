exports.createRow = (cells, count) => `
  <tr>
    <td>${count}</td>
    ${cells}
  </tr>
`;

exports.createCell = (item) => `
  <td>${item.label}</td>
`;

exports.createHeader = (item) => `
  <th>${item.label}</th>
`

exports.createTable = (rows) => `
  <table>
    ${rows}
  </table>
`;

exports.createHtml = (table) => `
  <html>
    <head>
      <style>
        table {
          width: 100%;
        }
        tr {
          text-align: left;
          border: 1px solid black;
        }
        th, td {
          padding: 15px;
        }
        tr:first-child {
          background: #009EDB
        }
        tr:nth-child(odd) {
          background: #CCC
        }
        tr:nth-child(even) {
          background: #FFF
        }
        .no-content {
          background-color: red;
        }
      </style>
    </head>
    <body>
      ${table}
    </body>
  </html>
`;

exports.createFormattedReport = (results) => {
  let rows = '';
  let headerCells = '';
  for (const col in results.reportExtendedMetadata.detailColumnInfo) {
    headerCells += this.createHeader(results.reportExtendedMetadata.detailColumnInfo[col]);
  }
  rows += this.createRow(headerCells, '');
  let rowNumber = 1;
  for (const row of results.factMap['T!T'].rows) {
    let cells = '';
    for (const cell of row.dataCells) {
      cells += this.createCell(cell);
    }
    rows += this.createRow(cells, rowNumber++);
  }
  const htmlTable = this.createTable(rows);
  const html = this.createHtml(htmlTable);
  return html;
};