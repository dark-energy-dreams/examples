interface AttributeInterface {
  attribute: string;
  value: string;
}

export default class XElement {
  private _name: string;

  private _text: string;

  private _value: string;

  private _attributes: AttributeInterface[] = [];

  public constructor(name: string) {
    this._name = name;
  }

  public toString(): string {
    this._value = '';
    this._value += `<${this.write(this._name)}`;

    this._attributes.forEach((x) => {
      this._value += ` ${this.write(x.attribute)}="${this.write(x.value)}"`;
    });

    this._value += `${
      this._text
        ? `>${this.write(this._text)}</${this.write(this._name)}>`
        : ` />`
    }`;

    return this._value;
  }

  public getStartNode(): string {
    this._value = '';
    this._value += `<${this.write(this._name)}`;

    this._attributes.forEach((x) => {
      this._value += ` ${this.write(x.attribute)}="${this.write(x.value)}"`;
    });

    this._value += `>`;

    return this._value;
  }

  public getEndNode(): string {
    this._value = '';
    this._value += `</${this.write(this._name)}>`;

    return this._value;
  }

  public addText(text: string) {
    if (text) {
      this._text = text;
    }
    return this;
  }

  public addAttribute(attribute: string, value: string) {
    if (attribute && value && value !== 'undefined') {
      this._attributes.push({ attribute, value });
    }
    return this;
  }

  private write(text: string) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
