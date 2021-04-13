const DataManager = require('./dm');
const fs = require('fs');
dm = new DataManager()
let func_name, user_id;
let msg = {
    project: "test_project",
    user: "test_user",
    operation: func_name,
    passwd: "test_passwd",
}
async function test_dm(){
    let resp = await dm[func_name](msg=msg)
    if(resp["error"]) {
        console.log(msg)
        console.log(resp)
    }
    return resp
}
async function test(){
    func_name = "initDatabase"
    await test_dm()
    func_name = "createUser"
    await test_dm()
    func_name = "checkUser"
    let resp = await test_dm()
    msg["user_id"] = resp["user_id"]
    func_name = "createProject"
    await test_dm()
    func_name = "createEntityType"
    msg["entity_type"] = "药物"
    await test_dm()
    msg["entity_type"] = "疾病"
    await test_dm()
    func_name = "createEntity"
    msg["entity_name"] = "肺炎"
    resp =await test_dm()
    let entity1Id = resp["entity_id"]
    msg["entity_name"] = "阿司匹林"
    msg["entity_type"] = "药物"
    resp = await test_dm()
    let entity2Id = resp["entity_id"]
    func_name = "setNodeProperty"
    msg["node_id"] = entity2Id;
    msg["properties"] = {
        "作用": "消炎",
        "不良反应": "腹泻"
    }
    resp = await test_dm()
    func_name = "createRelationType"
    msg["relation_type"] = "治疗";
    let roles = {
        "药物": {
            "entity_type":"药物"
        },
        "疾病": {
            "entity_type":"疾病",
            "min": 0,
            "max": 1,
        },
    };
    msg["roles"] = roles;
    await test_dm();
    func_name = "createRelation"
    roles = {
        "药物": entity2Id,
        "疾病": entity1Id
    }
    msg["roles"] = roles;
    resp = await test_dm();
    let relaId = resp["relation_id"];
    func_name = "getGraph"
    resp = await test_dm();
    console.log(JSON.stringify(resp,null,'\t'));
    func_name = "deleteRelation"
    msg["relation_id"] = relaId;
    await test_dm();
    func_name = "deleteEntity"
    msg["entity_id"] = entity1Id
    await test_dm();
}

async function test_with_data(){
    let duplicated_type = ["相关疾病","相关症状","检查"]
    func_name = "initDatabase"
    await test_dm()
    func_name = "createUser"
    await test_dm()
    func_name = "checkUser"
    let resp = await test_dm()
    msg["user_id"] = resp["user_id"]
    func_name = "createProject"
    await test_dm()
    console.time("write")
    func_name = "createEntityType"
    let entity_types=["症状","疾病","药物","诊疗"]
    for(let et of entity_types){
        msg["entity_type"] = et;
        await test_dm()
    }

    // let entitymap = {};
    // func_name = "createEntity"
    // let data = fs.readFileSync('entities.txt', 'UTF-8');
    // let lines = data.split(/\r?\n/)
    // for (const line of lines) {
    //     let strs = line.split(" ");
    //     msg['entity_name'] = strs[0];
    //     msg['entity_type'] = strs[1];
    //     resp = await test_dm();
    //     entitymap[strs[0]] = resp["entity_id"]
    // }


    func_name = "createRelationType"
    data = fs.readFileSync('relations_type.txt', 'UTF-8');
    lines = data.split(/\r?\n/)
    for (const line of lines) {
        let strs = line.split(" ");
        if(duplicated_type.includes(strs[1])) continue;
        msg['relation_type'] = strs[1];
        msg['roles'] = {}
        msg['roles'][strs[0]]=strs[0];
        msg['roles'][strs[2]]=strs[2];
        resp = await test_dm();
    }

    // func_name = "createRelation"
    // data = fs.readFileSync('relations.txt', 'UTF-8');
    // lines = data.split(/\r?\n/)
    // for (const line of lines) {
    //     let strs = line.split(" ");
    //     if(duplicated_type.includes(strs[4])) continue;
    //     msg['relation_type'] = strs[4];
    //     msg['roles'] = {}
    //     msg['roles'][strs[1]]=entitymap[strs[0]];
    //     msg['roles'][strs[3]]=entitymap[strs[2]];
    //     resp = await test_dm();
    // }
    console.timeEnd("write")
    console.time("read")
    func_name = "getGraph"
    resp = await test_dm();
    console.log(Object.keys(resp.entities).length)
    console.log(Object.keys(resp.relations).length)
    console.timeEnd("read")
    console.log(resp)
}

test()

