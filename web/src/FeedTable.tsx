import { Box, Button, Header, Table } from '@cloudscape-design/components';
import React, { FC } from 'react';

const FeedTable: FC = () => {
    return (
        <Table
            columnDefinitions={[
                {
                    id: "msgid",
                    header: "Message ID",
                    cell: e => e.msgid,
                    sortingField: "msgid"
                },
                {
                    id: "srcnum",
                    header: "Source Number",
                    cell: e => e.srcnum,
                    sortingField: "srcnum"
                },
                {
                    id: "status",
                    header: "Message Status",
                    cell: e => e.status,
                    sortingField: "status"
                },
                {
                    id: "msgbody",
                    header: "Message Body",
                    cell: e => e.body,
                    sortingField: "msgbody"
                },
                {
                    id: "msglang",
                    header: "Language",
                    cell: e => e.msglang,
                    sortingField: "msglang"
                },
                {
                    id: "transbody",
                    header: "Translated Body",
                    cell: e => e.transbody,
                    sortingField: "transbody"
                },
                {
                    id: "action",
                    header: "Action",
                    cell: e => e.action,
                },
            ]}
            items={[
                {
                    msgid: "2b0ad7b8-dd88-5afa-a35f-8b69c749c0fc",
                    srcnum: "+12028675309",
                    status: "PENDING",
                    body: "Foo",
                    msglang: "en",
                    transbody: "Foo",
                    action: <Button variant="primary">Button</Button>
                },
                {
                    msgid: "2b0ad7b8-dd88-5afa-a35f-8b69c749c0fd",
                    srcnum: "+12028675309",
                    status: "PENDING",
                    body: "Bar",
                    msglang: "en",
                    transbody: "Bar"
                },
                {
                    msgid: "2b0ad7b8-dd88-5afa-a35f-8b69c749c0fe",
                    srcnum: "+12028675309",
                    status: "PENDING",
                    body: "Baz",
                    msglang: "en",
                    transbody: "Baz"
                },
                {
                    msgid: "2b0ad7b8-dd88-5afa-a35f-8b69c749c0ff",
                    srcnum: "+12028675309",
                    status: "PENDING",
                    body: "Poo",
                    msglang: "en",
                    transbody: "Poo"
                },
            ]}
            loadingText="Loading resources"
            variant="embedded"
            empty={
                <Box textAlign="center" color="inherit">
                    <b>No resources</b>
                    <Box
                        padding={{ bottom: "s" }}
                        variant="p"
                        color="inherit"
                    >
                        No resources to display.
                    </Box>
                    <Button>Create resource</Button>
                </Box>
            }
            header={<Header> Current Messages </Header>}
        />
    );
};

export default FeedTable;