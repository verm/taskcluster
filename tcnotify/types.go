// This source code file is AUTO-GENERATED by github.com/taskcluster/jsonschema2go

package tcnotify

import (
	"encoding/json"
	"errors"
)

type (
	// Request to post a message on IRC.
	//
	// See http://schemas.taskcluster.net/notify/v1/irc-request.json#/oneOf[0]
	ChannelMessage struct {

		// Channel to post the message in.
		//
		// Syntax:     ^[#&][^ ,\u0007]{1,199}$
		// Min length: 1
		//
		// See http://schemas.taskcluster.net/notify/v1/irc-request.json#/oneOf[0]/properties/channel
		Channel string `json:"channel"`

		// See http://schemas.taskcluster.net/notify/v1/irc-request.json#/oneOf[0]/properties/message
		Message IRCMessageText `json:"message"`
	}

	// IRC message to send as plain text.
	//
	// Min length: 1
	// Max length: 510
	//
	// See http://schemas.taskcluster.net/notify/v1/irc-request.json#/oneOf[1]/definitions/message
	IRCMessageText string

	// Optional link that can be added as a button to the email.
	//
	// See http://schemas.taskcluster.net/notify/v1/email-request.json#/properties/link
	Link struct {

		// Where the link should point to.
		//
		// Min length: 1
		// Max length: 1024
		//
		// See http://schemas.taskcluster.net/notify/v1/email-request.json#/properties/link/properties/href
		Href string `json:"href"`

		// Text to display on link.
		//
		// Min length: 1
		// Max length: 40
		//
		// See http://schemas.taskcluster.net/notify/v1/email-request.json#/properties/link/properties/text
		Text string `json:"text"`
	}

	// Request to post a message on IRC.
	//
	// One of:
	//   * ChannelMessage
	//   * PrivateMessage
	//
	// See http://schemas.taskcluster.net/notify/v1/irc-request.json#
	PostIRCMessageRequest json.RawMessage

	// Request to post a message on pulse.
	//
	// See http://schemas.taskcluster.net/notify/v1/pulse-request.json#
	PostPulseMessageRequest struct {

		// IRC message to send as plain text.
		//
		// Additional properties allowed
		//
		// See http://schemas.taskcluster.net/notify/v1/pulse-request.json#/properties/message
		Message json.RawMessage `json:"message"`

		// Routing-key to use when posting the message.
		//
		// Max length: 255
		//
		// See http://schemas.taskcluster.net/notify/v1/pulse-request.json#/properties/routingKey
		RoutingKey string `json:"routingKey"`
	}

	// Request to post a message on IRC.
	//
	// See http://schemas.taskcluster.net/notify/v1/irc-request.json#/oneOf[1]
	PrivateMessage struct {

		// See http://schemas.taskcluster.net/notify/v1/irc-request.json#/oneOf[1]/properties/message
		Message IRCMessageText `json:"message"`

		// User to post the message to.
		//
		// Syntax:     ^[A-Za-z\[\]\\~_\^{|}][A-Za-z0-9\-\[\]\\~_\^{|}]{0,254}$
		// Min length: 1
		// Max length: 255
		//
		// See http://schemas.taskcluster.net/notify/v1/irc-request.json#/oneOf[1]/properties/user
		User string `json:"user"`
	}

	// Request to send an email
	//
	// See http://schemas.taskcluster.net/notify/v1/email-request.json#
	SendEmailRequest struct {

		// E-mail address to which the message should be sent
		//
		// See http://schemas.taskcluster.net/notify/v1/email-request.json#/properties/address
		Address string `json:"address"`

		// Content of the e-mail as **markdown**, will be rendered to HTML before
		// the email is sent. Notice that markdown allows for a few HTML tags, but
		// won't allow inclusion of script tags and other unpleasantries.
		//
		// Min length: 1
		// Max length: 102400
		//
		// See http://schemas.taskcluster.net/notify/v1/email-request.json#/properties/content
		Content string `json:"content"`

		// Optional link that can be added as a button to the email.
		//
		// See http://schemas.taskcluster.net/notify/v1/email-request.json#/properties/link
		Link Link `json:"link,omitempty"`

		// Reply-to e-mail (this property is optional)
		//
		// See http://schemas.taskcluster.net/notify/v1/email-request.json#/properties/replyTo
		ReplyTo string `json:"replyTo,omitempty"`

		// Subject line of the e-mail, this is plain-text
		//
		// Min length: 1
		// Max length: 255
		//
		// See http://schemas.taskcluster.net/notify/v1/email-request.json#/properties/subject
		Subject string `json:"subject"`

		// E-mail html template used to format your content.
		//
		// Possible values:
		//   * "simple"
		//   * "fullscreen"
		//
		// Default:    "simple"
		//
		// See http://schemas.taskcluster.net/notify/v1/email-request.json#/properties/template
		Template string `json:"template,omitempty"`
	}
)

// MarshalJSON calls json.RawMessage method of the same name. Required since
// PostIRCMessageRequest is of type json.RawMessage...
func (this *PostIRCMessageRequest) MarshalJSON() ([]byte, error) {
	x := json.RawMessage(*this)
	return (&x).MarshalJSON()
}

// UnmarshalJSON is a copy of the json.RawMessage implementation.
func (this *PostIRCMessageRequest) UnmarshalJSON(data []byte) error {
	if this == nil {
		return errors.New("PostIRCMessageRequest: UnmarshalJSON on nil pointer")
	}
	*this = append((*this)[0:0], data...)
	return nil
}
