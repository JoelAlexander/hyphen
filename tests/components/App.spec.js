import React from 'react';
import renderer from 'react-test-renderer';
import App from 'App';

describe('App Component Test Suite', () => {
  it('Should render properly to DOM', () => {
    const wrapper = renderer.create();
    expect(wrapper.toJSON()).toMatchSnapshot();
  });
});

