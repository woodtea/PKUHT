const DataManager = require('./dm');
dm = new DataManager()
let empty_func = (resp)=>{console.log(resp)};
let func_name, user_id;
let msg = {
    project: "test_project",
    user: "test_user",
    operation: func_name,
    passwd: "test_passwd",
}
async function test_dm(){
    let resp = await dm[func_name](msg=msg)
    if(resp['error']) console.log(resp)
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
    func_name = "createRelationType"
    msg["relation_type"] = "治疗";
    let roles = {
        "药物": "药物",
        "疾病": "疾病",
    };
    msg["roles"] = roles;
    await test_dm();
    func_name = "createRelation"
    roles = {
        "药物": entity2Id,
        "疾病": entity1Id
    }
    msg["roles"] = roles;
    await test_dm();
    func_name = "getGraph"
    resp = await test_dm();
    console.log(resp)
}

test()

