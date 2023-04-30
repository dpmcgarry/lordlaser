export class LordLaserConstants {
    // To fork this repo you'll need to change these values
    // Set these to your own forked repo / branch names
    public static GITHUB_REPO = "dpmcgarry/lordlaser";
    public static GITHUB_BRANCH = "main";

    // Set this to the public DNS to use for your website
    public static WEB_DNS = "lordlaser.org";

    // Set this to the guid of the ACM cert for your api DNS
    public static WEB_ACM_CERTIFICATE_GUID = "713a080a-8b13-4446-9959-a59d543ef0c7";

    // Set this to the public DNS to use for your api
    public static API_DNS = "api.lordlaser.org";

    // Set this to the guid of the ACM cert for your api DNS
    public static API_ACM_CERTIFICATE_GUID = "49410fb0-e8e7-4aa4-854f-941c2d00ed58";

    // You shouldn't need to change these values to fork this repo
    public static API_EXEC_NAME = "lordlaser-api";
    public static API_ARTIFACT_NAME = "lordlaser-api.zip"
    public static MESSAGE_TABLE_NAME = "lordlaser-messages";
    public static ARTIFACT_BUCKET_PARAM = "LordLaserArtifactBucket";
    public static UI_BUCKET_PREFIX = "ui";
    public static THROTTLE_LAMBDA_NAME = "LordLaserThrottle";
    public static API_LAMBDA_NAME = "LordLaserApi";
    public static THROTTLE_EXEC_NAME = "lordlaser-throttle";
    public static THROTTLE_ARTIFACT_NAME = "lordlaser-throttle.zip";
    public static THROTTLE_TABLE_NAME = "lordlaser-throttles";
    public static CODESTAR_GUID_PARAM = "GitHubCodeStarGuid";
};

class InternalConstants {
    public static ACCT_PLACEHOLDER = "%ACCT%";
    public static REGION_PLACEHOLDER = "%REGION%";
    public static GUID_PLACEHOLDER = "%GUID%";
    public static CODESTAR_CONNECTION_ARN = "arn:aws:codestar-connections:" + this.REGION_PLACEHOLDER + ":" + this.ACCT_PLACEHOLDER + ":connection/" + this.GUID_PLACEHOLDER;
    public static ACM_CERTIFICATE_ARN = "arn:aws:acm:" + this.REGION_PLACEHOLDER + ":" + this.ACCT_PLACEHOLDER + ":certificate/" + this.GUID_PLACEHOLDER;
};

export function GenerateCodestarARN(account: string, region: string, guid: string): string {
    return InternalConstants.CODESTAR_CONNECTION_ARN
        .replace(InternalConstants.ACCT_PLACEHOLDER, account)
        .replace(InternalConstants.REGION_PLACEHOLDER, region)
        .replace(InternalConstants.GUID_PLACEHOLDER, guid)
};

export function GenerateACMCertificateARN(account: string, region: string, guid: string): string {
    return InternalConstants.ACM_CERTIFICATE_ARN
        .replace(InternalConstants.ACCT_PLACEHOLDER, account)
        .replace(InternalConstants.REGION_PLACEHOLDER, region)
        .replace(InternalConstants.GUID_PLACEHOLDER, guid)
};