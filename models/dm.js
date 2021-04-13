
const neo4j = require('neo4j-driver')
const con = require('./const')
const utils = require('./utils')
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', con.DB_PASSWD))

function DataManager() {
}

DataManager.prototype.initDatabase = async function (msg) {
    var session = driver.session()
    var resp = utils.extractBasic(msg)
    try{
        await session.run('MATCH (n) DETACH DELETE n')
        await session.run('CREATE CONSTRAINT ON (u:User) ASSERT u.name IS UNIQUE')
        await session.run('CREATE CONSTRAINT ON (p:Project) ASSERT p.name IS UNIQUE')
        await session.run('CREATE CONSTRAINT ON (e:EType) ASSERT e.name IS UNIQUE')
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp
}

DataManager.prototype.createUser = async function (msg) {
    var session = driver.session();
    var resp = utils.extractBasic(msg);
    try{
        await session.run('CREATE (u:User ' +
            '{name : {name},' +
            'passwd: {passwd}})', {
            name: msg.user,
            passwd: msg.passwd
        })
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp
}

DataManager.prototype.checkUser = async function (msg) {
    var session = driver.session();
    var resp = utils.extractBasic(msg);
    try{
        let res = await session.run('MATCH (u:User {name : {name},\
                            passwd: {passwd}}) \
                            RETURN id(u) AS uid', {
            name: msg.user,
            passwd: msg.passwd,
        })
        let records = res.records;
        if (records.length != 0)
        {
            resp.msg = 'Success'
            resp.user_id = records[0].get('uid')
        }
        else
        {
            resp.msg = "User not exists";
        }
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp
}

DataManager.prototype.createProject = async function (msg) {
    var session = driver.session();
    var resp = utils.extractBasic(msg);
    try{
        await session.run('CREATE (p:Project {name : {nameParam}})', {
            nameParam: msg.project
        })
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp
}

DataManager.prototype.createEntityType = async function (msg) {
    var session = driver.session();
    var resp = utils.extractBasic(msg);
    try{
        var cypher = `MATCH (p:Project {name: "${msg.project}"})\
        MERGE (t:EType {name: "${msg.entity_type}"})\
        MERGE (p)-[:has]->(t)\
        RETURN id(t) AS nodeId`;
        let res=await session.run(cypher)
        resp['entity_type_id'] = res.records[0].get('nodeId')
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp
}

let refer = async function (userid, nodeid, session) {
    let cypher = `MATCH (u) WHERE id(u) = ${userid}\
    MATCH (n) WHERE id(n) = ${nodeid}\
    MERGE (u)-[:refer]->(n)`
    await session.run(cypher)
}

DataManager.prototype.createEntity = async function (msg) {
    var session = driver.session();
    var resp = utils.extractBasic(msg)
    try{
        let cypher = `MATCH (p:Project {name: "${msg.project}"})\
        MATCH (p)-[:has]->(e:Entity {name: "${msg.entity_name}"})\
        MATCH (e)-[:inst_of]->(t:EType)\
        WHERE not t.name = "${msg.entity_type}"\
        RETURN t.name AS typeName`;
        let res=await session.run(cypher)
        if(res.records.length!=0){
            throw new Error(`entity exists, type is ${res.record[0].get('typeName').toString()}`);
        }
        cypher = `MATCH (p:Project {name: "${msg.project}"})\
        MATCH (p)-[:has]->(et:EType {name: "${msg.entity_type}"})\
        MERGE (p)-[:has]->(e:Entity {name: "${msg.entity_name}"})\
        MERGE (e)-[:inst_of]->(et)\
        RETURN id(e) AS nodeId`;
        res=await session.run(cypher)
        let nodeid = res.records[0].get('nodeId')
        resp['entity_id'] = nodeid;
        await refer(msg.user_id, nodeid, session)
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp
}

DataManager.prototype.createRelationType = async function (msg) {
    var session = driver.session();
    var resp = utils.extractBasic(msg);
    try{
        let cypher = `MATCH (p:Project {name: "${msg.project}"})\
        MATCH (p)-[:has]->(t:RType {name: "${msg.relation_type}"})\
        RETURN id(t) AS typeid`;
        let res=await session.run(cypher)
        if(res.records.length!=0) {
            throw new Error(`the relation type has already exists`);
        }
        cypher = `MATCH (p:Project {name: "${msg.project}"})\
        CREATE (p) - [:has] -> (t:RType {name: "${msg.relation_type}"}) `;
        let i = 0;
        for(let [role,value] of Object.entries(msg.roles)){
            let minvalue = typeof(value["min"])==undefined?value["min"]:1;
            let maxvalue = typeof(value["max"])==undefined?value["max"]:1;
            cypher+=`WITH p,t\
                     MATCH (p) - [:has] -> (et${i}:EType {name: "${value["entity_type"]}"})\
                     CREATE (t) - [:has_role {name: "${role}", min:${minvalue}, max:${maxvalue}}] -> (et${i++})`
        }
        cypher+='RETURN id(t) AS typeId'
        res=await session.run(cypher)
        resp['relation_type_id'] = res.records[0].get('typeId')
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp
}

DataManager.prototype.createRelation = async function (msg) {
    var session = driver.session();
    var resp = utils.extractBasic(msg);
    try{
        let cypher = `MATCH (p:Project {name: "${msg.project}"})\
        MATCH (p)-[:has]->(r:Relation)\
        MATCH  (r)-[:inst_of] -> (re:RType{name: "${msg.relation_type}"}) `
        let i = 0;
        for(let role in msg.roles){
            cypher+=`MATCH (r) - [:${role}] -> (e${i}:E) WHERE id(e${i++})=${msg.roles[role]} `
        }
        cypher+='RETURN id(r) AS relationId'
        let res=await session.run(cypher)
        let relationId;
        if(res.records.length==0) {
            let cypher = `MATCH (p:Project {name: "${msg.project}"})\
            MATCH (p)-[:has] -> (re:RType{name: "${msg.relation_type}"})\
            CREATE (p)-[:has]->(r:Relation)\
            CREATE (r)-[:inst_of] -> (re) `
            let i = 0;
            for(let role in msg.roles){
                cypher+=`WITH r\
                        MATCH (e${i}:Entity) WHERE id(e${i})=${msg.roles[role]}\
                        CREATE (r) - [:${role}] -> (e${i++}) `
            }
            cypher+='RETURN id(r) AS relationId'
            res = await session.run(cypher)
            relationId = res.records[0].get('relationId')
        }else {
            relationId = res.records[0].get('relationId')
        }
        resp['relation_id'] = relationId
        await refer(msg.user_id, relationId, session)
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp
}

let getEntityTypes = async function(project,session){
    let cypher = `Match (p:Project {name: "${project}"})
    Match (p) - [:has] -> (et:EType)
    Return et`;
    let res = await session.run(cypher)
    let ets = {};
    for (let et of res.records){
        ets[et._fields[0].identity]=et._fields[0].properties.name;
    }
    return ets;
}

let getRelationTypes = async function(project,session){
    let cypher = `Match (p:Project {name: "${project}"})
    Match (p) - [:has] -> (rt:RType)
    Match (rt) - [hr:has_role] -> (et:EType)
    Return rt,collect(distinct [hr, et]) AS roles`
    let res = await session.run(cypher)
    let rts = {};
    for (let rt of res.records){
        let rt_obj  = {
            "name":rt._fields[0].properties.name,
            "roles":{}
        }
        for(let role of rt._fields[1]){
            rt_obj["roles"][role[0].properties.name] = {
                "entity_type":role[1].properties.name,
                "min": role[0].properties.min,
                "max": role[0].properties.max,
            }
        }
        rts[rt._fields[0].identity]=rt_obj
    }
    return rts;
}

let getEntities = async function(project,userid,session){
    let cypher = `Match (p:Project {name: "${project}"})
    Match (u:User) Where id(u)=${userid}
    Match (p) - [:has] -> (e:Entity) <- [:refer] - (u)
    Match (e) - [:inst_of] -> (et:EType)
    Return e,et.name as type`
    let res = await session.run(cypher)
    let ens = {};
    for (let en of res.records){
        ens[en._fields[0].identity]={
            "type":en._fields[1]
        }
        for(let [key,value] of Object.entries(en._fields[0].properties)){
            ens[en._fields[0].identity][key] = value
        }
    }
    return ens;
}

let getRelations = async function(project,userid,session){
    let cypher = `Match (p:Project {name: "${project}"})
    Match (u:User) Where id(u)=${userid}
    Match (p) - [:has] -> (r:Relation) <- [:refer] - (u)
    Match (r) - [:inst_of] -> (rt:RType)
    Match (r) - [role] -> (e:Entity)
    Return r,rt.name as type, collect(distinct[role,e]) as roles`
    let res = await session.run(cypher)
    let relas = {};
    for (let rela of res.records){
        let rela_inst = {
            "type":rela._fields[1],
            "roles":{}
        }
        for(let [key,value] of Object.entries(rela._fields[0].properties)){
            rela_inst[key] = value
        }
        for(let role of rela._fields[2]){
            rela_inst["roles"][role[0].type]=role[1].identity.toNumber()
        }
        relas[rela._fields[0].identity] = rela_inst
    }
    return relas;
}

DataManager.prototype.getGraph = async function(msg){
    var session = driver.session();
    var resp = utils.extractBasic(msg);
    try{
        resp["entity_types"] = await getEntityTypes(msg.project,session)
        resp["relation_types"] = await getRelationTypes(msg.project,session)
        resp["entities"] = await getEntities(msg.project, msg.user_id, session)
        resp["relations"] = await getRelations(msg.project, msg.user_id, session)
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp
}

DataManager.prototype.setNodeProperty = async function(msg){
    var session = driver.session();
    var resp = utils.extractBasic(msg);
    try{
        let cypher = `Match (n) where id(n)=${msg["node_id"]} `
        for(let key in msg["properties"]){
            cypher += `Set n.${key} = "${msg["properties"][key]}" `
        }
        await session.run(cypher)
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp;
}

DataManager.prototype.deleteEntity = async function(msg){
    var session = driver.session();
    var resp = utils.extractBasic(msg);
    try{
        let cypher = `Match (u:User) - [ref:refer] - (e:Entity)
                      Where id(u)=${msg.user_id} and id(e)=${msg.entity_id}
                      Optional Match (u:User) - [ref_r:relation] -> (r:relation) - [] -> (e:Entity) 
                      Delete ref,ref_r
                      Return ref,ref_r`
        let res =  await session.run(cypher)
        if(res.records.length==0) {
            throw new Error(`refer to the entity not exists`);
        }
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp
}

DataManager.prototype.deleteRelation = async function(msg){
    var session = driver.session();
    var resp = utils.extractBasic(msg);
    try{
        let cypher = `Match (u:User) - [ref:refer] - (r:Relation)
                      Where id(u)=${msg.user_id} and id(r)=${msg.relation_id}
                      Delete ref
                      Return ref`
        let res =  await session.run(cypher)
        if(res.records.length==0) {
            throw new Error(`refer to the relation not exists`);
        }
    }catch(err){
        resp.error = true;
        resp.msg = err;
    }finally {
        await session.close()
    }
    return resp
}
module.exports = DataManager;