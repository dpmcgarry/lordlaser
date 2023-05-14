import { Box, Button, Header, SpaceBetween, Table } from '@cloudscape-design/components';
import { Component, FC } from 'react';
import ILaserMessage from './types/LaserMessage.type';
import lasermessagesService from './services/lasermessages.service';

type Props = {};

type State = {
    messages: Array<ILaserMessage>,
};

export default class FeedTable extends Component<Props, State>{
    interval: any;
    constructor(props: Props) {
        super(props);
        this.getMessages = this.getMessages.bind(this);

        this.state = {
            messages: []
        };
        this.interval = null;
    }

    componentDidMount(): void {
        this.getMessages();
        // this.interval = setInterval(this.getMessages, 5000);
    }

    componentWillUnmount(): void {
        // clearInterval(this.interval);
    }

    getMessages() {
        lasermessagesService.getAll()
            .then((response: any) => {
                this.setState({
                    messages: response.data
                });
                console.log(response.data);
            })
            .catch((e: Error) => {
                console.log(e);
            });
    }

    updateMessage(message: ILaserMessage, status: string) {
        console.log("Publishing message: " + message.ID);
        message.Status = status;
        lasermessagesService.update(message, message.ID)
            .then((response: any) => {
                console.log(response);
                this.getMessages();
            })
            .catch((e: Error) => {
                console.log(e);
            })
    }


    getPublishAction(message: ILaserMessage) {
        if (message.Status === "PENDING") {
            return <Button onClick={() => this.updateMessage(message, "POSTED")}>Publish</Button>;
        } else if (message.Status === "POSTED") {
            return <Button onClick={() => this.updateMessage(message, "PENDING")}>Remove</Button>;
        }
        else {
            return <Button disabled>Published</Button>;
        }

    }

    render() {
        const { messages } = this.state;
        return (
            <Table
                columnDefinitions={[
                    {
                        id: "Received",
                        header: "Received",
                        cell: e => e.Received,
                        sortingField: "Received"
                    },
                    {
                        id: "Source",
                        header: "Source Number",
                        cell: e => e.Source,
                        sortingField: "Source"
                    },
                    {
                        id: "Status",
                        header: "Message Status",
                        cell: e => e.Status,
                        sortingField: "Status"
                    },
                    {
                        id: "Body",
                        header: "Message Body",
                        cell: e => e.Body,
                        sortingField: "Body"
                    },
                    {
                        id: "Language",
                        header: "Language",
                        cell: e => e.Language,
                        sortingField: "Language"
                    },
                    {
                        id: "TranslatedBody",
                        header: "Translated Body",
                        cell: e => e.TranslatedBody,
                        sortingField: "TranslatedBody"
                    },
                    {
                        id: "Publish",
                        header: "Publish",
                        cell: e => e.PubAction,
                        sortingField: "Publish"
                    },
                ]}
                items={messages.map((message: ILaserMessage) => ({
                    Received: message.Received,
                    Source: message.Source,
                    Status: message.Status,
                    Body: message.Body,
                    Language: message.Language,
                    TranslatedBody: message.TranslatedBody,
                    PubAction: this.getPublishAction(message)
                }))}
                loadingText="Loading messages"
                variant="full-page"
                sortingDisabled
                stripedRows
                empty={
                    <Box textAlign="center" color="inherit">
                        <Box
                            padding={{ bottom: "s" }}
                            variant="p"
                            color="inherit"
                        >
                            No messages to display.
                        </Box>
                    </Box>
                }
                header={<Header
                    actions={
                        <SpaceBetween
                            direction="horizontal"
                            size="xs">
                            <Button variant='icon' iconName='refresh' onClick={this.getMessages}></Button>
                        </SpaceBetween>
                    }
                > Manage Feed </Header>}
            />
        );
    }
}