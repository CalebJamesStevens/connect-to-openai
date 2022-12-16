const vscode = require('vscode');

function sendApiCall (arg) {
  const https = require('https');
  const apiKey = vscode.workspace.getConfiguration('connect-to-openai').apiKey;

  if (apiKey) {
    vscode.window.showErrorMessage('Please provide a valid API key in the entension configuration.');
    return;
  }

  const configs = vscode.workspace.getConfiguration('connect-to-openai').get('parameters');

  const denulledConfigs = {}
  
  Object.entries(configs).forEach((entry) => {
    if(entry[1] !== null) {
      denulledConfigs[entry[0]] = entry[1];
    }
  })

  const data = JSON.stringify({...denulledConfigs, prompt: arg});

  const options = {
    hostname: 'api.openai.com',
    path: '/v1/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  };


  const req = https.request(options, res => {
    let response = '';
    res.on('data', d => {
      response = d;
    });
    res.on('end', () => {
      const parsedRes = JSON.parse(response);
      if (parsedRes.error) {
        vscode.window.showErrorMessage(`${parsedRes.error.message} Type:${parsedRes.error.type} Param:${parsedRes.error.param} Code:${parsedRes.error.code}`);
        return;
      }
      const editor = vscode.window.activeTextEditor;
      const choices = parsedRes.choices.map(choice => choice.text);
      editor.edit((editBuilder) => {
        editBuilder.insert(editor.selection.end, '\n' + choices)
      })
    });
  });

  req.on('error', error => {
    console.error(error);
  });

  req.write(data);
  req.end();

  return req;
}


function activate (context) {
	let disposable = vscode.commands.registerCommand('connect-to-openai.prompt-openai', function () {
    const editor = vscode.window.activeTextEditor;
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    sendApiCall(selectedText);

	});

	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
