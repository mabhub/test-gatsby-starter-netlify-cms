import React, { Component } from 'react';
import axios from 'axios';

import Autosuggest from 'react-autosuggest';
import { debounce } from 'lodash';

import { parseSuggestions } from '../helpers';

import './GeoSearch.scss';

const renderSuggestion = suggestion => <span>{suggestion.label}</span>;

const buildJSONQuery = (
  value,
  fields = ['nom', 'type'],
  querySuffix = 'AND COMMUNE',
) => JSON.stringify({
  query: {
    query_string: {
      fields,
      query: `${value} ${querySuffix}`,
      default_operator: 'AND',
    },
  },
});

class GeoSearch extends Component {
  constructor (props) {
    super(props);

    this.state = {
      value: '',
      isLoading: false,
      suggestions: [],
    };

    this.loadSuggestions = debounce(this.loadSuggestions, 500);

    if (props.initialSearch) {
      this.directSearch(props.initialSearch.split('=')[1]);
    }
  }

  onChange = (event, { newValue }) => {
    this.setState({
      value: newValue,
    });
  };

  onSuggestionSelected = (event, selection) => {
    // const { suggestion, suggestionValue, suggestionIndex, sectionIndex, method } = selection;
    if (typeof this.props.onSelect === 'function') {
      this.props.onSelect(selection);
    }
  };

  getSuggestionValue = suggestion => suggestion.label;

  directSearch (value) {
    const lookup = buildJSONQuery(value, ['code_insee', 'type'], 'AND COMMUNE OR CANTON');

    axios.get(`https://es.makina-corpus.net/cg44/address/_search?source=${lookup}`)
      .then(res => res.data)
      .then(data => {
        const suggestion = {
          suggestion: {
            label: 'noname',
            data: data.hits.hits[0],
          },
        };
        this.onSuggestionSelected(null, suggestion);
      });
  }

  loadSuggestions (value) {
    this.setState({
      isLoading: true,
    });

    const nameLookup = buildJSONQuery(value);

    axios.get(`https://es.makina-corpus.net/cg44/address/_search?source=${nameLookup}`)
      .then(res => res.data)
      .then(data => {
        if (data.hits.total === 0) {
          axios.get(`https://es.makina-corpus.net/cg44/address/_search?default_operator=AND&q=${value}`)
            .then(res => res.data)
            .then(data2 => {
              this.setState({
                isLoading: false,
                suggestions: parseSuggestions(data2.hits.hits),
              });
            });
        } else {
          this.setState({
            isLoading: false,
            suggestions: parseSuggestions(data.hits.hits),
          });
        }
      });
  }

  render () {
    const { value, suggestions } = this.state;
    const inputProps = {
      ...this.props.inputProps,
      value,
      onChange: this.onChange,
    };

    return (
      <div className={this.state.isLoading ? 'loading' : ''}>
        <Autosuggest
          suggestions={suggestions}
          onSuggestionsFetchRequested={res => this.loadSuggestions(res.value)}
          onSuggestionsClearRequested={() => this.setState({ suggestions: [] })}
          onSuggestionSelected={this.onSuggestionSelected}
          getSuggestionValue={this.getSuggestionValue}
          renderSuggestion={renderSuggestion}
          inputProps={inputProps}
          highlightFirstSuggestion
        />
      </div>
    );
  }
}

export default GeoSearch;
