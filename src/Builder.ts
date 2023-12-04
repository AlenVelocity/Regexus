class RegExpBuilder {
    private _flags: string = ''
    private _literal: string[] = []
    private _groupsUsed: number = 0
    private _min: number = -1
    private _max: number = -1
    private _of: string = ''
    private _ofAny: boolean = false
    private _ofGroup: number = -1
    private _from: string = ''
    private _notFrom: string = ''
    private _like: string | null = null
    private _either: string | null = null
    private _reluctant: boolean = false
    private _capture: boolean = false
    private _captureName: string | null = null

    constructor() {
        this.clear()
    }

    private clear(): void {
        this._min = -1
        this._max = -1
        this._of = ''
        this._ofAny = false
        this._ofGroup = -1
        this._from = ''
        this._notFrom = ''
        this._like = null
        this._either = null
        this._reluctant = false
        this._capture = false
    }

    private flushState(): void {
        if (
            this._of !== '' ||
            this._ofAny ||
            this._ofGroup > 0 ||
            this._from !== '' ||
            this._notFrom !== '' ||
            this._like !== null
        ) {
            const captureLiteral = this._capture ? (this._captureName ? `?P<${this._captureName}>` : '') : '?:'
            const quantityLiteral = this.getQuantityLiteral()
            const characterLiteral = this.getCharacterLiteral()
            const reluctantLiteral = this._reluctant ? '?' : ''

            this._literal.push(`(${captureLiteral}(?:${characterLiteral})${quantityLiteral}${reluctantLiteral})`)

            this.clear()
        }
    }

    private getQuantityLiteral(): string {
        if (this._min !== -1) {
            if (this._max !== -1) {
                return `{${this._min},${this._max}}`
            }
            return `{${this._min},}`
        }
        return `{0,${this._max}}`
    }

    private getCharacterLiteral(): string {
        switch (true) {
            case this._of !== '':
                return this._of
            case this._ofAny:
                return '.'
            case this._ofGroup > 0:
                return `\\${this._ofGroup}`
            case this._from !== '':
                return `[${this._from}]`
            case this._notFrom !== '':
                return `[^${this._notFrom}]`
            case this._like !== null:
                return this._like as string
            default:
                return ''
        }
    }

    /**
     * Returns the literal representation of the RegExp
     * @returns {string}
     */
    public getLiteral(): string {
        this.flushState()
        return this._literal.join('')
    }

    private combineGroupNumberingAndGetLiteralral(r: RegExpBuilder): string | null {
        const literal = this.incrementGroupNumbering(r.getLiteral(), this._groupsUsed)
        this._groupsUsed += r._groupsUsed
        return literal
    }

    private incrementGroupNumbering(literal: string, increment: number): string | null {
        if (increment > 0) {
            literal = literal.replace(/\\(\d+)/g, (groupReference) => {
                const groupNumber = parseInt(groupReference.substring(1)) + increment
                return `\\${groupNumber}`
            })
        }
        return literal
    }

    /**
     * Returns the usable RegExp
     * @returns {RegExp}
     */
    public getRegExp(): RegExp {
        this.flushState()
        return new RegExp(this._literal.join(''), this._flags)
    }

    private addFlag(flag: string): RegExpBuilder {
        if (this._flags.indexOf(flag) === -1) {
            this._flags += flag
        }
        return this
    }

    public ignoreCase(): RegExpBuilder {
        return this.addFlag('i')
    }

    /**
     * Makes the RegExp match across multiple lines
     * @returns {RegExpBuilder}
     */
    public multiLine(): RegExpBuilder {
        return this.addFlag('m')
    }

    /**
     * Enables global matching of the RegExp
     * @returns {RegExpBuilder}
     */
    public globalMatch(): RegExpBuilder {
        return this.addFlag('g')
    }

    /**
     * Starts the RegExp matching at the beginning of the input
     * @returns {RegExpBuilder}
     */
    public startOfInput(): RegExpBuilder {
        this._literal.push('(?:^)')
        return this
    }

    /**
     * Starts the RegExp matching at the beginning of the line
     * @returns {RegExpBuilder}
     */
    public startOfLine(): RegExpBuilder {
        this.multiLine()
        return this.startOfInput()
    }

    /**
     * Ends the RegExp matching at the end of the input
     * @returns {RegExpBuilder}
     */
    public endOfInput(): RegExpBuilder {
        this.flushState()
        this._literal.push('(?:$)')
        return this
    }

    /**
     * Ends the RegExp matching at the end of the line
     * @returns {RegExpBuilder}
     */
    public endOfLine(): RegExpBuilder {
        this.multiLine()
        return this.endOfInput()
    }

    /**
     * Matches the input string against the RegExp
     * @param {string} input
     * @returns {boolean}
     */
    public eitherFind(r: string | RegExpBuilder): RegExpBuilder {
        if (typeof r === 'string') {
            return this.setEither(this.getNew().exactly(1).of(r))
        }
        return this.setEither(r)
    }

    private setEither(r: RegExpBuilder): RegExpBuilder {
        this.flushState()
        this._either = this.combineGroupNumberingAndGetLiteralral(r)
        return this
    }

    public orFind(r: string | RegExpBuilder): RegExpBuilder {
        if (typeof r === 'string') {
            return this.setOr(this.getNew().exactly(1).of(r))
        }
        return this.setOr(r)
    }

    public anyOf(r: (string | RegExpBuilder)[]): RegExpBuilder {
        if (r.length < 1) {
            return this
        }

        const firstToken = r.shift()
        this.eitherFind(firstToken as string)
        r.forEach((token) => {
            this.orFind(token)
        })

        return this
    }

    private setOr(r: RegExpBuilder): RegExpBuilder {
        const either = this._either
        const or = this.combineGroupNumberingAndGetLiteralral(r)

        if (either === null) {
            let lastOr = this._literal[this._literal.length - 1]
            lastOr = lastOr.substring(0, lastOr.length - 1)
            this._literal[this._literal.length - 1] = lastOr
            this._literal.push(`|(?:${or}))`)
        } else {
            this._literal.push(`(?:(?:${either})|(?:${or}))`)
        }

        this.clear()
        return this
    }

    public neither(r: string | RegExpBuilder): RegExpBuilder {
        if (typeof r === 'string') {
            return this.notAhead(this.getNew().exactly(1).of(r))
        }
        return this.notAhead(r)
    }

    public nor(r: string | RegExpBuilder): RegExpBuilder {
        if (this._min === 0 && this._ofAny) {
            this._min = -1
            this._ofAny = false
        }
        this.neither(r)
        return this.min(0).ofAny()
    }

    public exactly(n: number): RegExpBuilder {
        this.flushState()
        this._min = n
        this._max = n
        return this
    }

    public min(n: number): RegExpBuilder {
        this.flushState()
        this._min = n
        return this
    }

    public max(n: number): RegExpBuilder {
        this.flushState()
        this._max = n
        return this
    }

    public of(s: string): RegExpBuilder {
        this._of = this.sanitize(s)
        return this
    }

    public ofAny(): RegExpBuilder {
        this._ofAny = true
        return this
    }

    public ofGroup(n: number): RegExpBuilder {
        this._ofGroup = n
        return this
    }

    public from(s: string[]): RegExpBuilder {
        this._from = this.sanitize(s.join(''))
        return this
    }

    public notFrom(s: string[]): RegExpBuilder {
        this._notFrom = this.sanitize(s.join(''))
        return this
    }

    public like(r: RegExpBuilder): RegExpBuilder {
        this._like = this.combineGroupNumberingAndGetLiteralral(r)
        return this
    }

    public reluctantly(): RegExpBuilder {
        this._reluctant = true
        return this
    }

    public ahead(r: RegExpBuilder): RegExpBuilder {
        this.flushState()
        this._literal.push(`(?=${this.combineGroupNumberingAndGetLiteralral(r)})`)
        return this
    }

    public notAhead(r: RegExpBuilder): RegExpBuilder {
        this.flushState()
        this._literal.push(`(?!${this.combineGroupNumberingAndGetLiteralral(r)})`)
        return this
    }

    public asGroup(name: string | null = null): RegExpBuilder {
        this._capture = true
        this._captureName = name
        this._groupsUsed++
        return this
    }

    public then(s: string): RegExpBuilder {
        return this.exactly(1).of(s)
    }

    public find(s: string): RegExpBuilder {
        return this.then(s)
    }

    public some(s: string[]): RegExpBuilder {
        return this.min(1).from(s)
    }

    public maybeSome(s: string[]): RegExpBuilder {
        return this.min(0).from(s)
    }

    public maybe(s: string): RegExpBuilder {
        return this.max(1).of(s)
    }

    public anything(): RegExpBuilder {
        return this.min(0).ofAny()
    }

    public anythingBut(s: string): RegExpBuilder {
        if (s.length === 1) {
            return this.min(1).notFrom([s])
        }
        this.notAhead(this.getNew().exactly(1).of(s))
        return this.min(0).ofAny()
    }

    public something(): RegExpBuilder {
        return this.min(1).ofAny()
    }

    public any(): RegExpBuilder {
        return this.exactly(1).ofAny()
    }

    public lineBreak(): RegExpBuilder {
        this.flushState()
        this._literal.push('(?:\\r\\n|\\r|\\n)')
        return this
    }

    public lineBreaks(): RegExpBuilder {
        return this.like(this.getNew().lineBreak())
    }

    public whitespace(): RegExpBuilder {
        if (this._min === -1 && this._max === -1) {
            this.flushState()
            this._literal.push('(?:\\s)')
            return this
        }
        this._like = '\\s'
        return this
    }

    public notWhitespace(): RegExpBuilder {
        if (this._min === -1 && this._max === -1) {
            this.flushState()
            this._literal.push('(?:\\S)')
            return this
        }
        this._like = '\\S'
        return this
    }

    public tab(): RegExpBuilder {
        this.flushState()
        this._literal.push('(?:\\t)')
        return this
    }

    public tabs(): RegExpBuilder {
        return this.like(this.getNew().tab())
    }

    public digit(): RegExpBuilder {
        this.flushState()
        this._literal.push('(?:\\d)')
        return this
    }

    public notDigit(): RegExpBuilder {
        this.flushState()
        this._literal.push('(?:\\D)')
        return this
    }

    public digits(): RegExpBuilder {
        return this.like(this.getNew().digit())
    }

    public notDigits(): RegExpBuilder {
        return this.like(this.getNew().notDigit())
    }

    public letter(): RegExpBuilder {
        this.exactly(1)
        this._from = 'A-Za-z'
        return this
    }

    public notLetter(): RegExpBuilder {
        this.exactly(1)
        this._notFrom = 'A-Za-z'
        return this
    }

    public letters(): RegExpBuilder {
        this._from = 'A-Za-z'
        return this
    }

    public notLetters(): RegExpBuilder {
        this._notFrom = 'A-Za-z'
        return this
    }

    public lowerCaseLetter(): RegExpBuilder {
        this.exactly(1)
        this._from = 'a-z'
        return this
    }

    public lowerCaseLetters(): RegExpBuilder {
        this._from = 'a-z'
        return this
    }

    public upperCaseLetter(): RegExpBuilder {
        this.exactly(1)
        this._from = 'A-Z'
        return this
    }

    public upperCaseLetters(): RegExpBuilder {
        this._from = 'A-Z'
        return this
    }

    public append(r: RegExpBuilder): RegExpBuilder {
        this.exactly(1)
        this._like = this.combineGroupNumberingAndGetLiteralral(r)
        return this
    }

    public optional(r: RegExpBuilder): RegExpBuilder {
        this.max(1)
        this._like = this.combineGroupNumberingAndGetLiteralral(r)
        return this
    }

    private sanitize(s: string): string {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    public getNew(): RegExpBuilder {
        const className = this.constructor as new () => RegExpBuilder
        return new className()
    }
}

export default RegExpBuilder
