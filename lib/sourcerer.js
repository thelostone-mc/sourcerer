'use babel';

import { CompositeDisposable } from 'atom';
import request from 'request';
import cheerio from 'cheerio';
import google from "google";

google.resultsPerPage = 1

export default {

  subscriptions: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'sourcerer:fetch': () => this.fetch(),
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  async fetch() {
    let self = this, editor;

    if(editor = atom.workspace.getActiveTextEditor()) {
      let language = editor.getGrammar().name,
          query = editor.getSelectedText();
      try {
        if(query === '') {
          atom.notifications.addWarning('query: string needed');
        }
        let url = await self.search(query, language);
        atom.notifications.addSuccess('google = success!')
        let html = await self.download(url);
        let answer = self.scrape(html);
        if (answer === '') {
          atom.notifications.addWarning('answer: 404. google it');
        } else {
          editor.insertText(answer);
        }
      } catch (error) {
        console.log(error);
        atom.notifications.addWarning(error.reason);
      }
    }
  },

  download(url) {
    return new Promise((resolve, reject) => {
      request(url, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          resolve(body);
        } else {
          let _error = {
            name: "download",
            reason: "Invalid URI: unable to fetch",
            trace: error
          };
          reject(_error);
        }
      });
    });
  },

  scrape(html) {
    let $ = cheerio.load(html);
    return $('div.accepted-answer pre code').text();
  },

  search(query, language) {
    return new Promise((resolve, reject) => {
      let searchString = `${query} in ${language} site:stackoverflow.com`;
      google(searchString, (err, res) => {
        if (err)
          reject({ search: '404. shit kaboom' });
        else if (res.links.length === 0)
          reject({ search: 'no results found' });
        else
          resolve(res.links[0].href);
      });
    });
  }
};
