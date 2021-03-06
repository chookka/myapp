var express = require('express');
var models = require('./single_model');
var redis_api = require('./redis_client');
var global_settings = require('../settings');
var async = require('async');
var redis = require('redis');
var client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});

// 定义一些 ajax url 对应的处理方法

var rsa_key=global_settings.rsa_key;

function start(req,res) {
    var name=req.param('name');
    models.User.find({ name: "chenhao" },function(err,result){
       var rsdic={};
       if(err){
           console.log('can not find');
       }else{
          // console.log(result);
           rsdic['users']=result;
           rsdic['info']='Reauest OK';
           rsdic['user_name']=name;
           res.send(rsdic);
           res.end();
       }
    })
};

function checkUserName(req,res){
    var user_name=req.param('name');
    var password=req.param('password');
    //var decrypt_password = rsa_key.decrypt(password);
    //var hmac = crypto.createHmac('sha1', rsa_public_key);
    //var encrypted_password= 'cc';
    models.User.find({ name:user_name,password:password},function(err,result){
        var rsdic={};
        if(err){
            console.log('can not find');
            rsdic['ret']='0002'
            rsdic['info']='Waring';
        }else{
            if(result.length==1){
                rsdic['ret']='0001';
            }else{
                rsdic['ret']='0003';
            }
            rsdic['info']='Success';
        }
        res.send(rsdic);
        res.end();
    })
};

function getGoogsList(req,res){
   models.Item_Record.find({status:"1"},function(err,result){
       var rsdic={};
       if(err){
           console.log('get good list error')
       }else{
           rsdic['goods']=result;
           rsdic['ret']='0001';
           rsdic['info']='Success';
       }
       res.send(rsdic);
       res.end();
   })
};

// 用lrange来获取商品列表
function getCategoryGoodListOld(req,res){
   // get rrecord from redis
   async.waterfall([
       function(readMysql){
           client.lrange('GOODS_LIST','0','-1',function(err,value){
               if (err){
                   console.log('Get Value By Key Error'+err);
               }
               console.log('----read from redis ----')
               readMysql(err,value);
           })
       },
       function readMysql(result,get_result){
           if(result.length > 0){
               //console.log(result)
               console.log('----return result from redis ----')
               var obj_list = result.map(function(obj){return JSON.parse(obj)});
               get_result(obj_list);
           }else{
               models.Item_Record.find({status:"1"},function(err,result){
                   console.log('----read from mysql ----')
                   if(err){
                       console.log(err);
                   }else{
                       get_result(result);
                       var stringify_obj_list = result.map(function(obj){// set value into redis
                               var json_obj = JSON.stringify(obj);
                               client.lpush("GOODS_LIST",json_obj);
                           return json_obj;}
                       );
                   }
               })
           }
       }
       ],
       function get_result(result){
           console.log('----get result----')
           var rsdic = {};
           rsdic['goods']=result;
           rsdic['ret']='0001';
           rsdic['info']='Success';
           res.send(rsdic);
           res.end();
       }
   )
};

// 用hget来获取商品列表
function getCategoryGoodList(req,res){
    // get rrecord from redis
    async.waterfall([
            function(readMysql){
                client.hvals('GOODS_HASH_LIST',function(err,value){
                    if (err){
                        console.log('Get Value By Key Error'+err);
                    }
                    console.log('----read from redis ----')
                    readMysql(err,value);
                })
                //client.hkeys('GOODS_HASH_LIST',function(err,result1){console.log(result1)});
            },
            function readMysql(result,get_result){
                if(result.length > 0){
                    //console.log(result)
                    console.log('----return result from redis ----')
                    //console.log(result);
                    var obj_list = result.map(function(obj){return JSON.parse(obj)});
                    get_result(obj_list);
                }else{
                    models.Item_Record.find({status:"1"},function(err,result){
                        console.log('----read from mysql ----')
                        if(err){
                            console.log(err);
                        }else{
                            get_result(result);
                            var stringify_obj_list = result.forEach(function(obj){// set value into redis
                                    var json_obj = JSON.stringify(obj);
                                    client.hset("GOODS_HASH_LIST",obj['sha1'],json_obj);
                                    }
                            );
                        }
                    })
                }
            }
        ],
        function get_result(result){
            console.log('----get result----')
            var rsdic = {};
            rsdic['goods']=result;
            rsdic['ret']='0001';
            rsdic['info']='Success';
            res.send(rsdic);
            res.end();
        }
    )
};

exports.start = start;
exports.checkUserName = checkUserName;
exports.getGoodList = getGoogsList;
exports.getCategoryGoodList = getCategoryGoodList;
