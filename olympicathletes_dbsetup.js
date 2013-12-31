var async = require('async'),
    nano = require('nano'),
    es = require('event-stream'),
    Q = require('q'),
    settings = require('./olympicathletes_settings.js');

var designdocs = {
    medals: {
        "_id" : "_design/medals",
        "filters": {
            "by_year": function(doc, req){   
                if (!req.query.year) {
                    return true;
                }
                if (doc.Year != req.query.year){
                    return false;
                }
                return true;
            },
            "by_country": function(doc, req){   
                if (!req.query.country) {
                    return true;
                }
                if (doc.Country != req.query.country){
                    return false;
                }
                return true; // passed!
            }
        },
        "views" : {
            "total" : {
                "map" : function(doc){ 
                    emit([doc.Year, doc.Country], doc['Total Medals'] * 1 ) 
                },
                "reduce" :  function(key, values, rereduce){ 
                    return sum(values); 
                } //          "reduce" :  "_sum"
            },
            "split" : {
                "map" : function(doc){ 
                    emit([doc.Year, doc.Country], { 
                        total: doc['Total Medals'] * 1, 
                        gold: doc['Gold Medals'] * 1 , 
                        silver: doc['Silver Medals'] * 1 , 
                        bronze: doc['Bronze Medals'] * 1 
                    });
                },
                "reduce" : function(key, values, rereduce){
                    var agg = {
                        total: 0,
                        gold: 0,
                        silver: 0,
                        bronze: 0
                    };

                    for(var i = values.length; i--;) {
                        agg.total += values[i].total;
                        agg.gold += values[i].gold;
                        agg.silver += values[i].silver;
                        agg.bronze += values[i].bronze;
                    }

                    return agg;
                }
            }
        }
    }
};

function log(){
    console.log.apply(console.log, arguments);
}

async.waterfall([
    function (next){
        var couchdb = nano(settings.couchurl);

        log('Connected to', settings.couchurl);

        couchdb.db.destroy(settings.dbname, function(err, res){
            couchdb.db.create(settings.dbname, function(err, res){
                
                log('Database', settings.dbname, 'recreated');
                if (!!err) log('\t', 'with errors', err);

                var db = couchdb.use(settings.dbname);
                next(err, db);
            });
        });
    },
    function (db, next){
        db.insert(designdocs.medals, function(err, body){
            next(err, db);
        });
    }
], function (err, result){
    if (!!err) {
        log('\t', 'with errors', err);
    } else {
        log('Database', settings.dbname, 'setup successfully');
    }
});





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