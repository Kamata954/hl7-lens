// Fictional messages for the three example buttons.
export const samples = {
    adt: String.raw`MSH|^~\&|REGISTRATION|DEMO_HOSPITAL|MONITORING|DEMO_WARD|20261104193000||ADT^A01^ADT_A01|DEMO0001|T|2.5.1
EVN|A01|20261104193000
PID|1||DEMO123^^^DEMO_HOSPITAL^MR||Rivera^Alex^J||19900514|U|||123 Example Street^^Indianapolis^IN^46204^USA||555-0100
NK1|1|Rivera^Sam|SPO|123 Example Street^^Indianapolis^IN^46204|555-0101
PV1|1|I|ICU^204^B^DEMO_HOSPITAL||||DEMO42^Patel^Morgan||||||||||||VISIT001
AL1|1|DA|DEMO^Example allergen^L|MI|Example reaction
NTE|1||Synthetic training data only.`,

    oru: String.raw`MSH|^~\&|LAB|DEMO_HOSPITAL|EHR|DEMO_HOSPITAL|20261104194500||ORU^R01^ORU_R01|DEMO0002|T|2.5.1
PID|1||DEMO123^^^DEMO_HOSPITAL^MR||Rivera^Alex||19900514|U
OBR|1|ORDER001|LAB001|24323-8^Comprehensive metabolic panel^LN|||20261104193000
OBX|1|NM|2345-7^Glucose^LN||92|mg/dL^milligrams per deciliter^UCUM|70-99|N|||F|||20261104193000
OBX|2|NM|2951-2^Sodium^LN||140|mmol/L^millimoles per liter^UCUM|135-145|N|||F|||20261104193000
OBX|3|ST|DEMO^Example note^L||Research \T\ training only~Second repeated value||||||F
NTE|1||All values are fictional.`,

    ack: String.raw`MSH|^~\&|EHR|DEMO_HOSPITAL|LAB|DEMO_HOSPITAL|20261104194600||ACK^R01^ACK|DEMO0003|T|2.5.1
MSA|AA|DEMO0002|Message accepted`
};

