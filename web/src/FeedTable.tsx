import { Box, Button, Header, Table } from '@cloudscape-design/components';
import { Component, FC } from 'react';
import ILaserMessage from './types/LaserMessage.type';
import lasermessagesService from './services/lasermessages.service';

type Props = {};

type State = {
  messages: Array<ILaserMessage>,
};

export default class FeedTable extends Component<Props, State>{
    interval:any;
    constructor(props:Props){
        super(props);
        this.getMessages = this.getMessages.bind(this);

        this.state = {
            messages: []
        };
        this.interval = null;
    }

    componentDidMount(): void {
        this.getMessages();
        this.interval = setInterval(this.getMessages, 5000);
    }

    componentWillMount(): void {
        
        clearInterval(this.interval);
    }

    getMessages(){
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

    render(){
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
                ]}
                items={messages}
                loadingText="Loading messages"
                variant="embedded"
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
                header={<Header> Current Messages </Header>}
            />
        );
    }
}