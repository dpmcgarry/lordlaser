package ddb

type Throttle struct {
	ThrottleType      string   `dynamodbav:"throttleType"`
	ThrottleValueList []string `dynamodbav:"throttleValueList"`
}
