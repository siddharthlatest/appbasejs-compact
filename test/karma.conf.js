module.exports = function(config){
  config.set({

    basePath : '../',

    files : [
      'bower_components/async/lib/async.js',
      'bower_components/chai/chai.js',
      'lib/atomic.js',
      'lib/appbase.js',
      'test/unit/**/*.js'
    ],

    autoWatch : true,

    frameworks: ['mocha'],

    browsers : ['Firefox'],

    plugins : [
            'karma-firefox-launcher',
            'karma-mocha'
            ],

    junitReporter : {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    }

  });
};
