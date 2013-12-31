var async = require('async'),
    nano = require('nano'),
    es = require('event-stream'),
    Q = require('q'),
    fs = require('fs'),
    csv = require('csv-streamify'),
    settings = require('./olympicathletes_settings.js');

function log(){
    console.log.apply(console.log, arguments);
}

async.waterfall([
    function (next){
        var couchdb = nano(settings.couchurl);
        var db = couchdb.use(settings.dbname);
        log('Connected to', settings.couchurl, settings.dbname);
        next(null, db);
    },
    function (db, next){
        cargoImport(db, function(err) {
            next(err)
        });
    }
], function (err){
    if (!!err) {
        log('\t', 'completed with errors', err);
    } else {
        log('Database', settings.dbname, 'setup successfully');
    }
});




function cargoImport(db, callback) {
    var pauser = es.pause();

    es.pipeline(
        fs.createReadStream(settings.csvfile),
        pauser,
        csv({
            newline: '\r\n',
            objectMode: true,
            columns: true
        }),
        es.through(function write(data) {
            worker.push(data);
        })
        );


    var worker = async.cargo(function(tasks, workDone){
        log('Inserting', tasks.length, 'docs');
        log('First Athlete:', tasks[0]);
        
        function doWork(){
            db.bulk({
                docs: tasks
            }, function(err, body, headers){
                log('Insert from Athlete:', tasks[0].Athlete, 'complete');
                if (err) {
                    log('\t', 'completed with errors', err);
                    callback(err);
                    return;
                }

                workDone();
            });
        }

        if (settings.import.delay) {
            setTimeout(doWork, settings.import.delay);
        } else {
            doWork();
        }
    }, settings.import.queuesize);

    // Throttle pipeline.
    // worker.saturated = function() { pauser.pause(); };
    // worker.empty = function() { pauser.resume(); };

    worker.drain = function() { callback(); };
}


        // Q.nfapply(couchdb.db.destroy, settings.dbname).then(function() {
        //     return 
        // })

        // var server = {
        //     db: {
        //         create: Q.nbind(couchdb.db.create, couchdb.db),
        //         destroy: Q.nbind(couchdb.db.destroy, couchdb.db)
        //     }
        // };
        // return server